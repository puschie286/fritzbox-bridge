import { BaseFeature } from "../lib/BaseFeature";
import { Capability } from "../types/Capability";
import { CapabilityType } from "../types/CapabilityType";

export class Battery extends BaseFeature
{
	public override async LateInit(): Promise<void>
	{
		await super.LateInit();

		console.log( 'set battery' );
		// set batteries (always AA)
		await this.device.setEnergy( {
			batteries: [ "AA", "AA" ]
		} );
	}

	protected Capabilities(): Array<Capability>
	{
		return [ {
			name: 'measure_battery', state: 'battery', type: CapabilityType.Integer
		},{
			name: 'measure_battery_low', state: 'batterylow', type: CapabilityType.Boolean
		} ];
	}
}