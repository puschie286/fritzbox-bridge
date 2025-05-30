import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';
import { CapabilityListener } from '../types/CapabilityListener';

export class SwitchControl extends BaseFeature
{
	protected Capabilities(): Array<Capability>
	{
		return [ {
			name: 'onoff', state: 'simpleonoff.state', type: CapabilityType.Boolean
		} ];
	}

	public override Listeners(): Array<CapabilityListener>
	{
		return [ { name: 'onoff', callback: this.onOnOff } ]
	}

	private async onOnOff( value: any )
	{
		const Value = Boolean( value );
		this.device.log( 'send simple onOff: ', Value );
		if( Value )
		{
			await this.device.GetAPI().setSimpleOnOff( this.device.getData().id, 1 );
		}
		else
		{
			await this.device.GetAPI().setSimpleOnOff( this.device.getData().id, 0 );
		}
	}
}
