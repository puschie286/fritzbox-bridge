export function Validate( object: any ): boolean
{
	return object !== undefined && object !== null;
}

export function ValidateUrl( url: string ): string
{
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

	let splitFactor =  1 / offset;

	return Math.round( value * splitFactor ) / splitFactor;
}

export function MaskCheck( value: number, mask: number ): boolean
{
	return ( value & mask ) === mask;
}
