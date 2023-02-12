import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';

export class Humidity extends BaseFeature
{
	private static ParseHumidity( value: number | null ): number | null
	{
		if( value === null || value < 0 || value > 100 )
		{
			return null;
		}

		return value;
	}

	protected Capabilities(): Array<Capability>
	{
		return [ {
			name: 'measure_humidity',
			state: 'humidity.rel_humidity',
			type: CapabilityType.Integer,
			valueFunc: Humidity.ParseHumidity
		} ];
	}
}
