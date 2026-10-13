import { Buffer } from 'node:buffer';
import { createHash, pbkdf2 } from 'node:crypto';
import { request as httpRequest, IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { setTimeout as setDeadline, clearTimeout as clearDeadline } from 'node:timers';
import { setTimeout as delay } from 'node:timers/promises';
import { URL, URLSearchParams } from 'node:url';
import { promisify } from 'node:util';
import { FritzboxApiDevice, FritzboxError, FritzboxNetwork, FritzboxOverview } from '../types/FritzboxTypes';
import type { FritzboxBlind, FritzboxColor, FritzboxTemperature } from '../types/FritzboxTypes';
import { Template } from '../types/Template';
import { FRITZBOX_COLORS } from './FritzboxColors';
import { ParseDeviceList, ParseTemplates, ParseXml } from './FritzboxXml';

const ZERO_SID = '0000000000000000';
const REQUEST_TIMEOUT = 30000;
const deriveKey = promisify( pbkdf2 );

function ProtocolError(): FritzboxError
{
	return new FritzboxError( 'Invalid FRITZ!Box response', 'EPROTO' );
}

function FiniteNumber( value: number ): number
{
	if( typeof value !== 'number' || !Number.isFinite( value ) )
	{
		throw new FritzboxError( 'Invalid numeric command value', 'EINVAL' );
	}
	return value;
}

// Authentication vectors and encodings follow the FRITZ! Session ID specification.
export async function CreateChallengeResponse( challenge: string, password: string ): Promise<string>
{
	if( typeof challenge !== 'string' || !challenge || /\s/.test( challenge ) ) throw ProtocolError();
	if( challenge.startsWith( '2$' ) )
	{
		const parts = challenge.split( '$' );
		if( parts.length !== 5 ) throw ProtocolError();
		const iterations = [ parts[1], parts[3] ].map( value =>
		{
			const number = Number( value );
			if( !/^\d+$/.test( value ) || !Number.isSafeInteger( number ) || number <= 0 || number > 2147483647 )
			{
				throw ProtocolError();
			}
			return number;
		} );
		if( ![ parts[2], parts[4] ].every( value => /^(?:[\da-f]{2})+$/i.test( value ) ) ) throw ProtocolError();
		const first = await deriveKey( Buffer.from( password, 'utf8' ), Buffer.from( parts[2], 'hex' ), iterations[0], 32, 'sha256' );
		const second = await deriveKey( first, Buffer.from( parts[4], 'hex' ), iterations[1], 32, 'sha256' );
		return parts[4] + '$' + second.toString( 'hex' );
	}
	if( !/^[\da-z]+$/i.test( challenge ) ) throw ProtocolError();
	const legacyPassword = Array.from( password, character => character.codePointAt( 0 )! > 255 ? '.' : character ).join( '' );
	const digest = createHash( 'md5' ).update( Buffer.from( challenge + '-' + legacyPassword, 'utf16le' ) ).digest( 'hex' );
	return challenge + '-' + digest;
}

export class FritzboxClient
{
	public static readonly MIN_TEMP = 8;
	public static readonly MAX_TEMP = 28;
	private readonly baseUrl: URL;
	private sid?: string;
	private pendingLogin?: Promise<string>;

	public constructor( private readonly username: string, private readonly password: string, url: string, private readonly strictssl: boolean = false )
	{
		try
		{
			this.baseUrl = new URL( url.includes( '://' ) ? url : 'https://' + url );
			if( ![ 'http:', 'https:' ].includes( this.baseUrl.protocol ) || this.baseUrl.username || this.baseUrl.password )
			{
				throw new Error();
			}
			this.baseUrl.pathname = this.baseUrl.pathname.replace( /\/+$/, '' );
			this.baseUrl.search = '';
			this.baseUrl.hash = '';
		}
		catch
		{
			throw new FritzboxError( 'Invalid FRITZ!Box URL', 'EINVAL' );
		}
	}

	public static Api2Temp( value: number ): string | number
	{
		FiniteNumber( value );
		if( value === 254 ) return 'on';
		if( value === 253 ) return 'off';
		return value / 2;
	}

	public static Temp2Api( state: string | boolean | number ): number
	{
		if( state === 'on' || state === true ) return 254;
		if( state === 'off' || state === false ) return 253;
		const value = typeof state === 'string' && state.trim() !== '' ? Number( state ) : state;
		if( typeof value !== 'number' ) throw new FritzboxError( 'Invalid target temperature', 'EINVAL' );
		return Math.round( Math.min( this.MAX_TEMP, Math.max( this.MIN_TEMP, FiniteNumber( value ) ) ) * 2 );
	}

	public async login(): Promise<void>
	{
		await this.GetSession();
	}

	private async Authenticate(): Promise<string>
	{
		const initial = ParseXml( await this.Request( '/login_sid.lua?version=2' ), 'SessionInfo' );
		const initialSid = this.ReadSid( initial.SID );
		if( initialSid !== ZERO_SID ) return initialSid;
		if( typeof initial.Challenge !== 'string' || typeof initial.BlockTime !== 'string' || !/^\d+$/.test( initial.BlockTime ) )
		{
			throw ProtocolError();
		}
		const blockTime = Number( initial.BlockTime );
		if( !Number.isSafeInteger( blockTime ) || blockTime > 2147483 ) throw ProtocolError();
		const response = await CreateChallengeResponse( initial.Challenge, this.password );
		if( blockTime > 0 ) await delay( blockTime * 1000 );
		const result = ParseXml( await this.Request( '/login_sid.lua?version=2', { username: this.username, response } ), 'SessionInfo' );
		const sid = this.ReadSid( result.SID );
		if( sid === ZERO_SID ) throw new FritzboxError( 'FRITZ!Box rejected the login credentials', 'EAUTH' );
		return sid;
	}

	private ReadSid( value: unknown ): string
	{
		if( typeof value !== 'string' || !/^[\da-f]{16}$/i.test( value ) ) throw ProtocolError();
		return value;
	}

	private async GetSession(): Promise<string>
	{
		if( this.sid !== undefined ) return this.sid;
		if( this.pendingLogin !== undefined ) return this.pendingLogin;
		const pending = this.Authenticate();
		this.pendingLogin = pending;
		try
		{
			this.sid = await pending;
			return this.sid;
		}
		finally
		{
			if( this.pendingLogin === pending ) this.pendingLogin = undefined;
		}
	}

	private async WithSession( action: ( sid: string ) => Promise<string> ): Promise<string>
	{
		const sid = await this.GetSession();
		try
		{
			return await action( sid );
		}
		catch( error )
		{
			// Only an explicit authentication rejection allows one replay. An actuator
			// may already have run when a timeout, parse error or connection failure occurs.
			if( !( error instanceof FritzboxError ) || error.code !== 403 ) throw error;
			if( this.sid === sid ) this.sid = undefined;
			return action( await this.GetSession() );
		}
	}

	private Request( path: string, form?: Record<string, string> ): Promise<string>
	{
		return new Promise( ( resolve, reject ) =>
		{
			const url = new URL( this.baseUrl.toString() );
			const [ pathname, search ] = path.split( '?' );
			url.pathname = this.baseUrl.pathname.replace( /\/+$/, '' ) + pathname;
			url.search = search ?? '';
			const body = form === undefined ? undefined : new URLSearchParams( form ).toString();
			let response: IncomingMessage | undefined;
			let finished = false;
			const deadline = setDeadline( () =>
			{
				const error = new FritzboxError( 'FRITZ!Box request timed out', 'ETIMEDOUT' );
				finish( error );
				request.destroy();
				response?.destroy();
			}, REQUEST_TIMEOUT );
			const finish = ( error?: Error, value?: string ) =>
			{
				if( finished ) return;
				finished = true;
				clearDeadline( deadline );
				if( error !== undefined ) reject( error );
				else resolve( value! );
			};
			const fail = ( error: NodeJS.ErrnoException ) =>
			{
				finish( new FritzboxError( 'FRITZ!Box transport failed', error.code ?? 'EIO' ) );
			};
			const makeRequest = url.protocol === 'https:' ? httpsRequest : httpRequest;
			const request = makeRequest( url, {
				method: body === undefined ? 'GET' : 'POST',
				rejectUnauthorized: this.strictssl,
				headers: body === undefined ? {} : {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Content-Length': Buffer.byteLength( body )
				}
			}, incoming =>
			{
				response = incoming;
				const status = incoming.statusCode ?? 0;
				let text = '';
				incoming.setEncoding( 'utf8' );
				incoming.on( 'data', chunk => { text += chunk; } );
				incoming.on( 'error', fail );
				incoming.on( 'aborted', () => fail( { name: 'Error', message: '', code: 'ECONNRESET' } ) );
				incoming.on( 'end', () =>
				{
					const html = /^\s*<(?:!doctype\s+html|html\b|form\b)/i.test( text )
						|| /\btext\/html\b/i.test( incoming.headers['content-type'] ?? '' );
					const loginForm = /<form\b[^>]*\baction\s*=\s*(["'])[^"']*\blogin\.lua(?:\?[^"']*)?\1/i.test( text );
					const loginRedirect = status >= 300 && status < 400 && /\/(?:login|login_sid)\.lua(?:[?#]|$)/i.test( incoming.headers.location ?? '' );
					if( status === 403 || loginRedirect || ( status >= 200 && status < 300 && html && loginForm ) )
					{
						finish( new FritzboxError( 'FRITZ!Box authentication or permission denied', 403 ) );
					}
					else if( status < 200 || status >= 300 )
					{
						finish( new FritzboxError( 'FRITZ!Box HTTP request failed', status ) );
					}
					else if( html ) finish( ProtocolError() );
					else finish( undefined, text );
				} );
			} );
			request.on( 'error', fail );
			request.end( body );
		} );
	}

	private Command( command: string, ain?: string, parameters: Record<string, string | number> = {} ): Promise<string>
	{
		return this.WithSession( sid =>
		{
			const query = new URLSearchParams( { sid, switchcmd: command } );
			if( ain !== undefined ) query.set( 'ain', ain );
			for( const [ key, value ] of Object.entries( parameters ) ) query.set( key, String( value ) );
			return this.Request( '/webservices/homeautoswitch.lua?' + query.toString() );
		} );
	}

	private async LoadData( extra: Record<string, string> = {} ): Promise<unknown>
	{
		const body = await this.WithSession( sid => this.Request( '/data.lua', { sid, xhr: '1', ...extra } ) );
		try
		{
			const result = JSON.parse( body );
			if( result === null || typeof result !== 'object' || Array.isArray( result ) || result.data === null
				|| typeof result.data !== 'object' || Array.isArray( result.data ) ) throw ProtocolError();
			return result;
		}
		catch
		{
			throw ProtocolError();
		}
	}

	public async getFritzboxOverview(): Promise<FritzboxOverview>
	{
		return await this.LoadData() as FritzboxOverview;
	}

	public async getFritzboxNetwork(): Promise<FritzboxNetwork>
	{
		return await this.LoadData( { page: 'netDev', xhrId: 'cleanup' } ) as FritzboxNetwork;
	}

	public async getDeviceList(): Promise<FritzboxApiDevice[]>
	{
		return ParseDeviceList( await this.Command( 'getdevicelistinfos' ) );
	}

	public async getTemplates(): Promise<Template[]>
	{
		return ParseTemplates( await this.Command( 'gettemplatelistinfos' ) );
	}

	public async applyTemplate( ain: string ): Promise<string>
	{
		return ( await this.Command( 'applytemplate', ain ) ).trim();
	}

	private async SetSwitch( command: string, ain: string ): Promise<number>
	{
		const body = ( await this.Command( command, ain ) ).trim();
		if( body !== '0' && body !== '1' ) throw ProtocolError();
		return Number( body );
	}

	public setSwitchOn( ain: string ): Promise<number>
	{
		return this.SetSwitch( 'setswitchon', ain );
	}

	public setSwitchOff( ain: string ): Promise<number>
	{
		return this.SetSwitch( 'setswitchoff', ain );
	}

	public async setTempTarget( ain: string, value: string | boolean | number ): Promise<string | boolean | number>
	{
		await this.Command( 'sethkrtsoll', ain, { param: FritzboxClient.Temp2Api( value ) } );
		return value;
	}

	public async setSimpleOnOff( ain: string, state: number | string ): Promise<number | string>
	{
		const states: Record<string, number> = { off: 0, on: 1, toggle: 2 };
		const onoff = typeof state === 'number' ? FiniteNumber( state ) : states[state.toLowerCase()];
		if( ![ 0, 1, 2 ].includes( onoff ) ) throw new FritzboxError( 'Invalid on/off state', 'EINVAL' );
		await this.Command( 'setsimpleonoff', ain, { onoff } );
		return state;
	}

	public async setLevelPercentage( ain: string, level: number ): Promise<number>
	{
		const clamped = Math.min( 100, Math.max( 0, FiniteNumber( level ) ) );
		await this.Command( 'setlevelpercentage', ain, { level: clamped } );
		return level;
	}

	public async setColor( ain: string, color: FritzboxColor, saturation: number, duration: number ): Promise<string>
	{
		const palette = FRITZBOX_COLORS[color];
		if( palette === undefined ) throw new FritzboxError( 'Invalid color', 'EINVAL' );
		await this.Command( 'setcolor', ain, {
			hue: palette.hue,
			saturation: Math.min( 255, Math.max( 0, FiniteNumber( saturation ) ) ),
			duration: Math.max( 0, FiniteNumber( duration ) )
		} );
		return color;
	}

	public async setColorTemperature( ain: string, temperature: FritzboxTemperature, duration: number ): Promise<number>
	{
		const values = [ 2700, 3000, 3400, 3800, 4200, 4700, 5300, 5900, 6500 ];
		const value = FiniteNumber( temperature );
		const adjusted = values.reduce( ( previous, current ) => Math.abs( current - value ) < Math.abs( previous - value ) ? current : previous );
		await this.Command( 'setcolortemperature', ain, { temperature: adjusted, duration: Math.max( 0, FiniteNumber( duration ) ) } );
		return adjusted;
	}

	public async setBlind( ain: string, target: FritzboxBlind ): Promise<string>
	{
		if( ![ 'open', 'close', 'stop' ].includes( target ) ) throw new FritzboxError( 'Invalid blind target', 'EINVAL' );
		await this.Command( 'setblind', ain, { target } );
		return target;
	}
}
