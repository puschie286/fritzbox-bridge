import { CapabilityDefinition } from "../../types/CapabilityDefinition";
import { BaseDevice } from "../../lib/BaseDevice";
import { CapabilityType } from "../../types/CapabilityType";
import { CapabilityOption } from "../../types/CapabilityOption";
import { CapabilityListener } from "../../types/CapabilityListener";
import { ConvertHelper } from "../../lib/ConvertHelper";

class Device extends BaseDevice
{
	protected CapabilityDefinitions(): CapabilityDefinition
	{
		return {
			'availability': { state: 'present', type: CapabilityType.Boolean },
			'measure_switch_mode': { state: 'switch.mode', type: CapabilityType.Boolean, valueFunc: ConvertHelper.CompareAuto, option: CapabilityOption.NoCast },
			'measure_device_locked': { state: 'switch.devicelock', type: CapabilityType.Boolean },
			'measure_api_locked': { state: 'switch.lock', type: CapabilityType.Boolean },
			'measure_power': { state: 'powermeter.power', type: CapabilityType.Number, valueFunc: ConvertHelper.ConvertPower },
			'meter_power': { state: 'powermeter.energy', type: CapabilityType.Number, valueFunc: ConvertHelper.ConvertPower },
			'measure_voltage': { state: 'powermeter.voltage', type: CapabilityType.Number, valueFunc: ConvertHelper.ConvertPower },
			'onoff': { state: 'switch.state', type: CapabilityType.Boolean }
		}
	}

	protected CapabilityListener(): CapabilityListener|null
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
