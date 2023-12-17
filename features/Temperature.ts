import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';
import Homey from 'homey/lib/Homey';

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

	protected Capabilities(): Array<Capability>
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

	public static RegisterCards( homey: Homey )
	{
		homey.flow.getConditionCard( 'temperature_is' ).registerRunListener( this.OnConditionTemperatureEqual );
	}

	private static OnConditionTemperatureEqual( args: any, state: any )
	{
		const device = args.device;
		const temperature = args.temperature;

		const value = parseFloat( device.getCapabilityValue( 'measure_temperature' ) );
		return value >= temperature;
	}
}
