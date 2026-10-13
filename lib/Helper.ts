import { LoginValidation } from '../types/LoginValidation';

export function Validate( object: any ): boolean
{
	return object !== undefined && object !== null;
}

export function ValidateUrl( url: string ): string
{
	// filter
	for( const invalid of [ '\n', '\t', '\r' ] )
	{
		url = url.replaceAll( invalid, '' );
	}

	// replace forward slashes
	url = url.replaceAll( '\\', '/' );

	if( url.indexOf( '://' ) === -1 )
	{
		return 'https://' + url;
	}

	return url;
}

export function Clamp( value: number, min: number, max: number ): number
{
	return Math.max( min, Math.min( value, max ) );
}

export function Round( value: number, offset: number = 1 ): number
{
	if( value % offset === 0 )
	{
		return value;
	}

	let splitFactor = 1 / offset;

	return Math.round( value * splitFactor ) / splitFactor;
}

export function MaskCheck( value: number, mask: number ): boolean
{
	return ( value & mask ) === mask;
}

export function Closest( value: number, values: Array<number> ): number
{
	return values.reduce( function( prev, cur )
	{
		return ( Math.abs( cur - value ) < Math.abs( prev - value ) ? cur : prev );
	} );
}

export function LoginValidationMessage( state: unknown, info: unknown ): string
{
	if( state === LoginValidation.Progress ) return 'Message.LoginChecking';
	if( state === LoginValidation.Valid ) return 'Message.ValidLogin';
	if( state !== LoginValidation.Invalid ) return 'Message.LoginRequired';
	if( info === 'Message.InvalidLogin' ) return 'Message.FixLogin';
	return typeof info === 'string' && info.startsWith( 'Message.' ) ? info : 'Message.ErrorLogin';
}

export function GetHttpErrorCode( error: any ): string | number | undefined
{
	return error?.error?.code ?? error?.error?.data?.code ?? error?.code ?? error?.cause?.code
		?? error?.statusCode ?? error?.response?.statusCode ?? error?.request?.response?.statusCode;
}

export function IsRetryableHttpError( error: any ): boolean
{
	return [
		'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNREFUSED',
		'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', '429', '502', '503', '504'
	].includes( String( GetHttpErrorCode( error ) ) );
}

export function HandleHttpError( error: any ): string | undefined
{
	if( error === '0000000000000000' ) return 'Message.InvalidLogin';
	const code = String( GetHttpErrorCode( error ) );
	if( code === 'EAUTH' ) return 'Message.InvalidLogin';
	if( [ 'ENOTFOUND', 'EAI_AGAIN' ].includes( code ) ) return 'Message.HostNotFound';
	if( [ 'ETIMEDOUT', 'ESOCKETTIMEDOUT', '504' ].includes( code ) ) return 'Message.Timeout';
	if( [ 'ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH' ].includes( code ) )
	{
		return 'Message.ConnectionFailed';
	}
	if( [
		'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'CERT_HAS_EXPIRED',
		'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'ERR_TLS_CERT_ALTNAME_INVALID'
	].includes( code ) ) return 'Message.InvalidSSL';
	if( [ '429', '502', '503' ].includes( code ) ) return 'Message.ServerCrashed';
	if( [ '401', '403' ].includes( code ) ) return 'Message.AccessForbidden';
	if( code === '404' ) return 'Message.NotFound';
	console.error( 'unknown HTTP error code: ' + code );
	return undefined;
}
