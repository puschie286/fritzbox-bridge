import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';

export class Alarm extends BaseFeature
{
	private static FormatTimestamp( value: number | null ): string | null
	{
		if( value === null || value === 0 )
		{
			return null;
		}

		const date = new Date( value );

		return date.toLocaleString();
	}

	protected Capabilities(): Array<Capability>
	{
		return [ {
			name: 'alarm_generic', state: 'alert.state', type: CapabilityType.Boolean
		}, {
			name: 'alarm_datetime', state: 'alert.lastalertchgtimestamp', type: CapabilityType.Integer, valueFunc: Alarm.FormatTimestamp
		} ]
	}
}
