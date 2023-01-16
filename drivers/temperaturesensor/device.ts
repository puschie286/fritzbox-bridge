import { BaseDevice } from "../../lib/BaseDevice";
import { CapabilityDefinition } from "../../types/CapabilityDefinition";
import { CapabilityType } from "../../types/CapabilityType";

class Device extends BaseDevice
{
	protected CapabilityDefinitions(): CapabilityDefinition
	{
		return {
			'availability': { state: 'present', type: CapabilityType.Boolean },
			'measure_temperature': { state: 'temperature.celsius', type: CapabilityType.Number, valueFunc: this.ConvertTemperature },
			'measure_temperature.offset': { state: 'temperature.offset', type: CapabilityType.Number, valueFunc: this.ConvertTemperature }
		}
	}

	private ConvertTemperature( value: number|null ): number|null
	{
		if( value === null )
		{
			return null;
		}

		return value / 10;
	}
}

module.exports = Device;
