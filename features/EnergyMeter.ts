import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';

export class EnergyMeter extends BaseFeature
{
	private readonly Current: string = 'measure_current';
	private Power: string = 'measure_power';

	private static ConvertPower( value: number | null ): number | null
	{
		if( value === null )
		{
			return null;
		}

		return value / 1000;
	}

	async LateInit(): Promise<void>
	{
		const value = this.device.getSetting( 'ignore_energy' ) ?? true;

		return this.UpdatePowerState( value );
	}

	private async UpdatePowerState( state: boolean )
	{
		this.Power = state ? 'alternative_power' : 'measure_power';
	}

	public async SettingsChanged( oldSettings: any, newSettings: any, changedKeys: string[] ): Promise<void>
	{
		return this.UpdatePowerState( newSettings.ignore_energy );
	}

	Capabilities(): Array<Capability>
	{
		// define current as last to ensure all other values are updated before current is calculated
		return [ {
			name: this.Power,
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
		const voltage = Number( this.device.getCapabilityValue( 'measure_voltage' ) );

		// calc final value and round to 4 digits
		const current = ( power / voltage ).toFixed( 4 )
		return Number( current );
	}
}
