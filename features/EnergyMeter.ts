import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';

export class EnergyMeter extends BaseFeature
{
	private static ConvertPower( value: number | null ): number | null
	{
		if( value === null )
		{
			return null;
		}

		return value / 1000;
	}

	protected Capabilities(): Array<Capability>
	{
		// define current as last to ensure all other values are updated before current is calculated
		return [ {
			name: 'measure_power',
			state: 'powermeter.power',
			type: CapabilityType.Number,
			valueFunc: EnergyMeter.ConvertPower
		}, {
			name: 'measure_voltage',
			state: 'powermeter.voltage',
			type: CapabilityType.Number,
			valueFunc: EnergyMeter.ConvertPower
		}, {
			name: 'meter_power',
			state: 'powermeter.energy',
			type: CapabilityType.Number,
			valueFunc: EnergyMeter.ConvertPower
		}, {
			name: 'measure_current',
			valueFunc: this.CalculateCurrent.bind( this )
		} ];
	}

	protected CalculateCurrent(): any
	{
		// get all needed values
		const power = Number( this.device.getCapabilityValue( 'measure_power' ) );
		const voltage = Number( this.device.getCapabilityValue( 'measure_voltage' ) );

		// calc final value and round to 4 digits
		const current = ( power / voltage ).toFixed( 4 )
		return Number( current );
	}
}
