import { BaseDevice } from "../../lib/BaseDevice";
import { CapabilityDefinition } from "../../types/CapabilityDefinition";
import { CapabilityType } from "../../types/CapabilityType";
import { Availability, Capability } from "../../types/Capability";
import { ConvertHelper } from "../../lib/ConvertHelper";

class Device extends BaseDevice
{
	protected CapabilityDefinitions(): CapabilityDefinition
	{
		return {
			'availability': { state: 'present', type: CapabilityType.Boolean },
			'measure_power': { state: 'powermeter.power', type: CapabilityType.Number, valueFunc: ConvertHelper.ConvertPower },
			'meter_power': { state: 'powermeter.energy', type: CapabilityType.Number, valueFunc: ConvertHelper.ConvertPower },
			'measure_voltage': { state: 'powermeter.voltage', type: CapabilityType.Number, valueFunc: ConvertHelper.ConvertPower },
		}
	}

	protected async UpdateProperty( name: string, capability: Capability, value: any )
	{
		// calculate measure_current with power, energy, voltage
		if( name !== Availability )
		{
			// get all needed values | new value if possible
			let Power = name === 'measure_pwer' ? capability.valueFunc!( value ) : this.getCapabilityValue( 'measure_power' );
			let Voltage = name === 'measure_voltage' ? capability.valueFunc!( value ) : this.getCapabilityValue( 'measure_voltage' );

			// calc final value and round to 4 digits
			let current = Number( Power / Voltage ).toFixed( 4 );
			if( current !== this.getCapabilityValue( 'measure_current' ) )
			{
				await this.setCapabilityValue( 'measure_current', current );
			}

			// skip because we emulate capability and don't use default implementation
			if( name === 'measure_current' ) return;
		}

		await super.UpdateProperty( name, capability, value );
	}
}

module.exports = Device;
