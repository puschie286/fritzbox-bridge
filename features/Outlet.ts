import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';
import { CapabilityListener } from '../types/CapabilityListener';

export class Outlet extends BaseFeature
{
	private static CompareAuto( value: any ): boolean
	{
		return String( value ) === 'auto';
	}

	protected Capabilities(): Array<Capability>
	{
		return [ {
			name: 'measure_switch_mode',
			state: 'switch.mode',
			type: CapabilityType.String,
			valueFunc: Outlet.CompareAuto
		}, {
			name: 'measure_device_locked', state: 'switch.devicelock', type: CapabilityType.Boolean
		}, {
			name: 'measure_api_locked', state: 'switch.lock', type: CapabilityType.Boolean
		}, {
			name: 'onoff', state: 'switch.state', type: CapabilityType.Boolean
		} ];
	}

	public override Listeners(): Array<CapabilityListener>
	{
		return [ { name: 'onoff', callback: this.onOnOff } ];
	}

	private async onOnOff( value: any )
	{
		const Value = Boolean( value );
		this.device.log( 'send onOff: ', Value );
		if( Value )
		{
			await this.device.GetAPI().setSwitchOn( this.device.getData().id );
		}
		else
		{
			await this.device.GetAPI().setSwitchOff( this.device.getData().id );
		}
	}
}
