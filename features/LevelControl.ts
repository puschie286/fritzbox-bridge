import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';
import { CapabilityListener } from '../types/CapabilityListener';

export class LevelControl extends BaseFeature
{
	protected Capabilities(): Array<Capability>
	{
		return [ {
			name: 'measure_level', state: 'levelcontrol.levelpercentage', type: CapabilityType.Integer
		} ];
	}

	Listeners(): Array<CapabilityListener>
	{
		return [ {
			name: 'measure_level', callback: this.setLevel
		} ];
	}

	private setLevel( value: any )
	{
		this.device.log( 'send setLevelPercentage: ' + parseInt( value ) );
		this.device.GetAPI().setLevelPercentage( this.device.getData().id, parseInt( value ) );
	}
}
