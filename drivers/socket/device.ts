import { BaseDevice } from "../../lib/BaseDevice";
import { CapabilityDefinition } from "../../types/CapabilityDefinition";
import { CapabilityType } from "../../types/CapabilityType";
import { CapabilityOption } from "../../types/CapabilityOption";
import { CapabilityListener } from "../../types/CapabilityListener";
import { ConvertHelper } from "../../lib/ConvertHelper";

class Device extends BaseDevice
{
	protected CapabilityDefinitions(): CapabilityDefinition
	{
		return {
			'availability': { state: 'present', type: CapabilityType.Boolean, hidden: true },
			'measure_switch_mode': { state: 'switch.mode', type: CapabilityType.Boolean, valueFunc: ConvertHelper.CompareAuto, option: CapabilityOption.NoCast },
			'measure_device_locked': { state: 'switch.devicelock', type: CapabilityType.Boolean },
			'measure_api_locked': { state: 'switch.lock', type: CapabilityType.Boolean },
			'onoff': { state: 'switch.state', type: CapabilityType.Boolean }
		};
	}

	protected CapabilityListener(): CapabilityListener
	{
		return {
			'onoff': this.onOnOff
		}
	}

	onOnOff( value: any )
	{
		let Value = Boolean( value );
		this.log( 'send onOff: ', Value );
		if( Value )
		{
		 	this.api.setSwitchOn( this.getData().id );
		}
		else
		{
			this.api.setSwitchOff( this.getData().id );
		}
	}
}

module.exports = Device;
