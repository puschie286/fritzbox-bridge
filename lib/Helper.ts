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

export function HandleHttpError( error: any ): 'timeout' | 'unknown' | any
{
	if( Validate( error ) )
	{
		if( Validate( error.error ) && Validate( error.error.code ) )
		{
			const code = error.error.code;
			if( code === 'ENOTFOUND' || code === 'ETIMEDOUT' )
			{
				return 'timeout';
			}
		}
		
		if( Validate( error.request ) && Validate( error.request.response ) )
		{
			return error.request.response;
		}
	}
	
	console.error( error );
	return 'unknown';
}