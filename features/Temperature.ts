import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';

export class Temperature extends BaseFeature
{
	private static ConvertTemperature( value?: number ): number | null
	{
		if( typeof value !== 'number' )
		{
			return null;
		}

		return value / 10;
	}

	public Capabilities(): Capability[]
	{
		return [ {
			name: 'measure_temperature',
			state: 'temperature.celsius',
			type: CapabilityType.Number,
			valueFunc: Temperature.ConvertTemperature
		}, {
			name: 'measure_temperature.offset',
			state: 'temperature.offset',
			type: CapabilityType.Number,
			valueFunc: Temperature.ConvertTemperature,
			options: {
				'title': {
					'en': 'Temperature offset', 'de': 'Temperatur Offset'
				}
			}
		} ];
	}
}
