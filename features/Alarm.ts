import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';

export class Alarm extends BaseFeature
{
	Capabilities(): Array<Capability>
	{
		return [ { name: 'alarm_generic', state: 'alert.state', type: CapabilityType.Boolean } ]
	}
}
