import { BaseFeature } from "../lib/BaseFeature";
import { Capability } from "../types/Capability";
import { CapabilityType } from "../types/CapabilityType";

export class EnergyMeter extends BaseFeature
{
	private readonly Current: string = 'measure_current';
	private readonly Power: string = 'measure_power';
	private readonly Voltage: string = 'measure_voltage';

	Capabilities(): Array<Capability>
	{
		// define current as last to ensure all other values are updated before current is calculated
		return [ {
			name: this.Power,
			state: 'powermeter.power',
			type: CapabilityType.Number,
			valueFunc: EnergyMeter.ConvertPower
		}, {
			name: this.Voltage,
			state: 'powermeter.voltage',
			type: CapabilityType.Number,
			valueFunc: EnergyMeter.ConvertPower
		}, {
			name: 'meter_power',
			state: 'powermeter.energy',
			type: CapabilityType.Number,
			valueFunc: EnergyMeter.ConvertPower
		}, {
			name: this.Current
		} ];
	}

	protected GetValue( capability: Capability, data: any ): any
	{
		if( capability.name !== this.Current )
		{
			return super.GetValue( capability, data );
		}

		// get all needed values
		const power = Number( this.device.getCapabilityValue( this.Power ) );
		const voltage = Number( this.device.getCapabilityValue( this.Voltage ) );

		// calc final value and round to 4 digits
		return ( power / voltage ).toFixed( 4 );
	}

	private static ConvertPower( value: number|null ): number|null
	{
		if( value === null )
		{
			return null;
		}

		return value / 1000;
	}
}