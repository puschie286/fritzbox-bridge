import { BaseFeature } from "../lib/BaseFeature";
import { Capability } from "../types/Capability";
import { CapabilityType } from "../types/CapabilityType";

export class Fritzbox extends BaseFeature
{
	Capabilities(): Array<Capability>
	{
		return [
			{ name: 'os_version', state: 'data.fritzos.nspver', type: CapabilityType.String },
			{ name: 'alert_update_available', state: 'data.fritzos.isUpdateAvail', type: CapabilityType.Boolean },
			{ name: 'power_usage', state: 'data.fritzos.energy', type: CapabilityType.Integer }
		];
	}

}
