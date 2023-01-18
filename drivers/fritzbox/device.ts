import { BaseDevice } from "../../lib/BaseDevice";
import { CapabilityDefinition } from "../../types/CapabilityDefinition";
import { CapabilityType } from "../../types/CapabilityType";
import { FlowCardTrigger } from "homey";
import { FritzboxDevice } from "../../types/FritzboxDevice";

export class Device extends BaseDevice
{
	protected CapabilityDefinitions(): CapabilityDefinition
	{
		return {
			'os_version': { state: 'data.fritzos.nspver', type: CapabilityType.String },
			'alert_update_available': { state: 'data.fritzos.isUpdateAvail', type: CapabilityType.Boolean },
			'power_usage': { state: 'data.fritzos.energy', type: CapabilityType.Integer }
		};
	}
}

module.exports = Device;
