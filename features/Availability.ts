import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';

export class Availability extends BaseFeature
{
	Capabilities(): Array<Capability>
	{
		return [ {
			name: 'availability', state: 'present', type: CapabilityType.Boolean, hidden: true
		} ];
	}

	protected async OnCapabilityUpdate( capability: Capability, value: any ): Promise<void>
	{
		if( this.device.getAvailable() === value ) return;

		if( value )
		{
			await this.device.setAvailable();
			this.device.log( 'Device ' + this.device.getName() + ' got available' );
		}
		else
		{
			await this.device.setUnavailable();
			this.device.log( 'Device ' + this.device.getName() + ' got unavailable' );
		}
	}
}
