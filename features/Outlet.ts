import { BaseFeature } from "../lib/BaseFeature";
import { Capability } from "../types/Capability";
import { CapabilityType } from "../types/CapabilityType";
import { ConvertHelper } from "../lib/ConvertHelper";
import { CapabilityListener } from "../types/CapabilityListener";

export class Outlet extends BaseFeature
{
	Capabilities(): Array<Capability>
	{
		return [ {
			name: 'measure_switch_mode', state: 'switch.mode', valueFunc: ConvertHelper.CompareAuto
		}, {
			name: 'measure_device_locked', state: 'switch.devicelock', type: CapabilityType.Boolean
		}, {
			name: 'measure_api_locked', state: 'switch.lock', type: CapabilityType.Boolean
		}, {
			name: 'onoff', state: 'switch.state', type: CapabilityType.Boolean
		} ];
	}

	Listeners(): Array<CapabilityListener>
	{
		return [ { name: 'onoff', callback: this.onOnOff } ];
	}

	private onOnOff( value: any )
	{
		const Value = Boolean( value );
		this.device.log( 'send onOff: ', Value );
		if( Value )
		{
			this.device.GetAPI().setSwitchOn( this.device.getData().id );
		} else
		{
			this.device.GetAPI().setSwitchOff( this.device.getData().id );
		}
	}
}
