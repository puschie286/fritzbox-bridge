export class ConvertHelper
{
	public static CompareAuto( value: any ): boolean
	{
		return String( value ) === 'auto';
	}

	public static ConvertPower( value: number|null ): number|null
	{
		if( value === null )
		{
			return null;
		}

		return value / 1000;
	}
}
