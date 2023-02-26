import { FritzApi } from '../types/FritzApi';
import { MaskCheck, Validate } from './Helper';
import { Settings } from './Settings';
import { BaseDriver } from './BaseDriver';
import { BaseDevice } from './BaseDevice';
import Homey from 'homey/lib/Homey';
import { Device } from '../drivers/fritzbox/device';
import { FritzboxTracker } from './FritzboxTracker';

export class FritzboxManager
{
	private static instance?: FritzboxManager;
	private apiInstance?: FritzApi;
	private polling?: NodeJS.Timeout;
	private pollRunning: boolean = false;
	private statusPolling?: NodeJS.Timeout;
	private statusPollRunning: boolean = false;
	private readonly homey: Homey;
	private readonly tracker: FritzboxTracker;
	private lastDeviceData?: any;

	public constructor( homey: Homey )
	{
		if( FritzboxManager.instance !== undefined )
		{
			throw new Error( 'already initialized - use FritzboxManager.GetSingleton' );
		}

		this.homey = homey;
		this.tracker = new FritzboxTracker( homey );

		FritzboxManager.instance = this;
	}

	public static GetSingleton(): FritzboxManager
	{
		if( this.instance === undefined )
		{
			throw new Error( 'not initialized' );
		}
		return this.instance;
	}

	/**
	 * get api instance (fritzapi)
	 *
	 * @return fritz
	 */
	public GetApi(): FritzApi
	{
		if( this.apiInstance === undefined )
		{
			throw new Error( 'no api instance' );
		}
		return this.apiInstance;
	}


	/*public async LogMessageOnline( message: string ): Promise<boolean>
	{
		const maxLength = 8000;
		let sendingMessage = message;

		while( sendingMessage.length > 0 )
		{
			const messagePart = sendingMessage.substr( 0, maxLength );
			sendingMessage = sendingMessage.substr( maxLength );

			if( await this.log.captureMessage( messagePart ) === undefined )
			{
				return false;
			}
		}

		return true;
	}*/

	public GetLastData(): any
	{
		return this.lastDeviceData;
	}

	// TODO: validate url, add http/https to address
	/**
	 * create new api instance ( set new login credential & options )
	 *
	 * @param username  fritzbox login username     ( default: no username )
	 * @param password  fritzbox login password     ( no default )
	 * @param url       fritzbox ip address         ( default: http://fritz.box )
	 * @param ssl       enable/disable strict ssl   ( default: true )
	 */
	public Connect( username: string, password: string, url: string, ssl: boolean )
	{
		this.StopPolling();
		this.StopStatusPolling();

		delete this.apiInstance;
		this.apiInstance = new FritzApi( username, password, url, ssl );
	}

	/**
	 * start polling with interval delay ( restart polling when active on call )
	 * min: 1000        ( 1 sec )
	 * max: 86400000    ( 1 day )
	 * @param interval  time delay between two polls in milliseconds ( default: 60000 )
	 */
	public async StartPolling( interval: number )
	{
		if( interval < Settings.POLL_MIN * 1000 || interval > Settings.POLL_MAX * 1000 )
		{
			this.homey.log( 'Invalid interval - cancel polling ( ' + interval + ' )' );
			return;
		}
		if( this.apiInstance === undefined )
		{
			this.homey.error( 'not connected to api' );
			return;
		}
		if( this.polling !== undefined )
		{
			this.StopPolling();
		}

		this.homey.log( 'start polling with ' + ( Math.round( ( interval / 1000 ) * 100 ) / 100 ) + 's interval' );
		this.polling = this.homey.setInterval( this.Poll.bind( this ), interval );

		// direct update
		await this.Poll();
	}

	/**
	 * start status polling with interval delay ( restart polling when active on call )
	 * min: 1000        ( 1 sec )
	 * max: 86400000    ( 1 day )
	 * @param interval  time delay between two polls in milliseconds ( default: 60000 )
	 */
	public async StartStatusPolling( interval: number )
	{
		if( interval < Settings.POLL_MIN * 1000 || interval > Settings.POLL_MAX * 1000 )
		{
			this.homey.log( 'Invalid interval - cancel status polling ( ' + interval + ' )' );
			return;
		}
		if( this.apiInstance === undefined )
		{
			this.homey.error( 'not connected to api' );
			return;
		}
		if( this.statusPolling !== undefined )
		{
			this.StopStatusPolling();
		}

		this.homey.log( 'start status polling with ' + ( Math.round( ( interval / 1000 ) * 100 ) / 100 ) + 's interval' );
		this.statusPolling = this.homey.setInterval( this.StatusPoll.bind( this ), interval );

		// direct update
		await this.StatusPoll();
	}

	/**
	 * stop active polling ( ignored when inactive on call )
	 */
	public StopPolling()
	{
		if( this.polling === undefined )
		{
			return;
		}

		this.homey.log( 'stop polling' );
		this.homey.clearInterval( this.polling );
		this.polling = undefined;
		this.pollRunning = false;
	}

	/**
	 * stop active status polling ( ignored when inactive on call )
	 */
	public StopStatusPolling()
	{
		if( this.statusPolling === undefined )
		{
			return;
		}

		this.homey.log( 'stop status polling' );
		this.homey.clearInterval( this.statusPolling );
		this.statusPolling = undefined;
		this.statusPollRunning = false;
	}

	// TODO: specify deviceList type
	/**
	 * filter deviceList based on functionmask ( device features )
	 *
	 * @param deviceList        list of all device objects
	 * @param functionMask      function bitmask number
	 * @return []               list of passed devices
	 */
	public FilterDevices( deviceList: any[], functionMask: number ): any[]
	{
		let validDevices: any[] = [];
		for( const device of deviceList )
		{
			if( !MaskCheck( device.functionbitmask, functionMask ) ) continue;
			validDevices.push( device );
		}
		return validDevices;
	}

	// TODO: specify deviceList type, specify identifier type
	/**
	 * filter deviceList based on identifier ( device unique )
	 *
	 * @param deviceList        list of all device objects
	 * @param identifier        device unique identifier
	 * @return null|{}          founded device or null
	 */
	public FilterDevice( deviceList: any[], identifier: any ): object | null
	{
		if( !Array.isArray( deviceList ) || deviceList.length === 0 ) return null;

		for( const device of deviceList )
		{
			if( device.identifier !== identifier ) continue;

			return device;
		}

		return null;
	}

	private async ProcessPoll( data: any[] )
	{
		const drivers = Object.entries( this.homey.drivers.getDrivers() );

		for( const [ _, driver ] of drivers )
		{
			const baseDriver = driver as BaseDriver;

			// skip fritzbox driver
			if( baseDriver.GetBaseFunction() === -1 ) continue;

			const devices = driver.getDevices();

			// skip if no devices
			if( devices.length === 0 ) continue;

			// filter specific driver
			let DriverDeviceList = this.FilterDevices( data, baseDriver.GetBaseFunction() );

			// update device
			for( const device of devices )
			{
				// @ts-ignore
				const baseDevice = device as BaseDevice;

				await baseDevice.Update( this.FilterDevice( DriverDeviceList, device.getData().id ) );
			}
		}
	}

	private async ProcessStatusPoll( overview: any[], network: any[] ): Promise<void>
	{
		await this.tracker.UpdateDevices( network );

		const devices = this.homey.drivers.getDriver( 'fritzbox' ).getDevices();
		for( const device of devices )
		{
			const fritzboxDevice = device as Device;

			await fritzboxDevice.Update( overview );
		}
	}

	/**
	 * poll data from fritzbox
	 */
	private async Poll(): Promise<void>
	{
		if( this.pollRunning )
		{
			console.debug( 'Skip poll - still waiting on last poll' );
			return;
		}

		this.pollRunning = true;

		try
		{
			this.lastDeviceData = await this.GetApi().getDeviceList();
			await this.ProcessPoll( this.lastDeviceData );
		} catch( error: any )
		{
			this.logPolError( error );
		}


		this.pollRunning = false;
	}

	private async StatusPoll()
	{
		if( this.statusPollRunning )
		{
			console.debug( 'Skip poll - still waiting on last status poll' );
			return;
		}

		this.statusPollRunning = true;

		try
		{
			const overview = await this.GetApi().getFritzboxOverview();
			const network = await this.GetApi().getFritzboxNetwork();
			await this.ProcessStatusPoll( overview, network );
		} catch( error: any )
		{
			this.logPolError( error );
		}

		this.statusPollRunning = false;
	}

	// helper
	private logPolError( error: any )
	{
		if( Validate( error ) && Validate( error.error ) && Validate( error.error.code ) )
		{
			let code = error.error.code;
			if( code === 'ENOTFOUND' || code === 'ETIMEDOUT' )
			{
				this.homey.log( 'poll timeout' );
				return;
			}
		}

		this.homey.error( 'poll failed' );
		this.homey.error( error );
	}
}
