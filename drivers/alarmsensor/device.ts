import { BaseDevice } from "../../lib/BaseDevice";
import { CapabilityDefinition } from "../../types/CapabilityDefinition";
import { CapabilityType } from "../../types/CapabilityType";

class Device extends BaseDevice
{
	protected CapabilityDefinitions(): CapabilityDefinition
	{
		return {
			'availability': { state: 'present', type: CapabilityType.Boolean },
			'alarm_generic': { state: 'alert.state', type: CapabilityType.Boolean }
		}
	}
}

module.exports = Device;
