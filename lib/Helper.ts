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
	return values.reduce( function( prev, cur)
	{
		return ( Math.abs( cur - value ) < Math.abs( prev - value ) ? cur : prev );
	} );
}

export function HandleHttpError( error: any ): string | undefined
{
	if( Validate( error ) )
	{
		if( Validate( error.error ) )
		{
			if( Validate( error.error.code ) )
			{
				return CheckErrorCodes( error.error.code );
			}
			
			if( Validate( error.error.data ) )
			{
				if( Validate( error.error.data.code ) )
				{
					return CheckErrorCodes( error.error.data)
				}
				
				console.error( 'unknown data' );
				console.error( error.error.data );
				return undefined;
			}
			
			console.error( 'unknown error' );
			console.error( error.error );
			return undefined;
		}
		
		if( Validate( error.response ) )
		{
			if( Validate( error.response.statusCode ) )
			{
				return CheckResponseCode( error.response.statusCode );
			}
			
			console.error( 'unknown response' );
			console.error( error.response );
			return undefined;
		}
		
		if( Validate( error.request ) )
		{
			if( Validate( error.request.response ) )
			{
				if( Validate( error.request.response.statusCode ) )
				{
					return CheckResponseCode( error.request.response.statusCode );
				}
				
				console.error( 'unknown request response' );
				console.error( error.request.response );
				return undefined;
			}
			
			console.error( 'unknown request' );
			console.error( error.request );
			return undefined;
		}
		
		if( error === '0000000000000000' )
		{
			return 'Message.InvalidLogin';
		}
		
		console.error( 'unknown error' );
		console.error( error );
		return undefined;
	}
	
	console.error( 'unknown' );
	return undefined;
}

function CheckResponseCode( code: any ): string | undefined
{
	if( code == 503 )
	{
		return 'Message.ServerCrashed';
	}
	
	if( code == 403 )
	{
		return 'Message.AccessForbidden';
	}
	
	console.error( 'unknown response code: ' + code );
	return undefined;
}

function CheckErrorCodes( code: any ): string | undefined
{
	if( code === 'ENOTFOUND' )
	{
		return 'Message.NotFound';
	}
	if( code === 'ETIMEDOUT' )
	{
		return 'Message.Timeout';
	}
	if( code === 'DEPTH_ZERO_SELF_SIGNED_CERT' )
	{
		return 'Message.InvalidSSL';
	}

	console.error( 'unknown error code: ' + code );
	return undefined;
}