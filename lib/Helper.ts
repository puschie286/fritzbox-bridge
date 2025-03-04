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

export function HandleHttpError( error: any ): string | undefined
{
	if( !Validate( error ) )
	{
		console.error( 'unknown (undefined)' );
		return undefined;
	}

	if( Validate( error.error ) )
	{
		if( Validate( error.error.code ) )
		{
			return CheckCode( error.error, error.error.code, 'error.code' );
		}

		if( Validate( error.error.data ) && Validate( error.error.data.code ))
		{
			return CheckCode( error.error, error.error.data.code, 'error.data.code' );
		}

		// fallback error
		return CheckCode( error.error, undefined, 'error' );
	}

	if( Validate( error.response ) )
	{
		if( Validate( error.response.statusCode ) )
		{
			return CheckCode( error.response, error.response.statusCode, 'response.statusCode' );
		}

		// fallback response
		return CheckCode( error.response, undefined, 'response' );
	}

	if( Validate( error.request ) )
	{
		if( Validate( error.request.response ) )
		{
			if( Validate( error.request.response.statusCode ) )
			{
				return CheckCode( error.request.response, error.request.response.statusCode, '(request).response.statusCode' );
			}
			
			// fallback request response
			return CheckCode( error.request.response, undefined, '(request).response' );
		}

		// fallback request
		return CheckCode( error.request, undefined, 'request' );
	}

	if( error === '0000000000000000' )
	{
		return 'Message.InvalidLogin';
	}

	console.error( 'unknown error' );
	console.error( error );
	return undefined;
}

function CheckCode( source: any, code: any, path: string ): string | undefined
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
	if( code == 503 )
	{
		return 'Message.ServerCrashed';
	}
	if( code == 403 )
	{
		return 'Message.AccessForbidden';
	}
	if( code == 404 )
	{
		return 'Message.NotFound';
	}
	
	console.error( 'unknown ' + path + ', ' + code );
	console.error( 'unknown ' + path + ' source: ' + JSON.stringify( source ) );
	return undefined;
}