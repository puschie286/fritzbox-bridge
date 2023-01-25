import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';
import { CapabilityListener } from '../types/CapabilityListener';

export class LevelControl extends BaseFeature
{
	Capabilities(): Array<Capability>
	{
		return [ {
			name: 'windowcoverings_set', state: 'levelcontrol.levelpercentage', type: CapabilityType.Integer, options: {
				'title': { 'en': 'Level', 'de': 'Level' }
			}
		} ];
	}

	Listeners(): Array<CapabilityListener>
	{
		return [ {
			name: 'windowcoverings_set', callback: this.setLevel
		} ];
	}

	private setLevel( value: any )
	{
		this.device.log( 'send setLevelPercentage: ' + parseInt( value ) );
		this.device.GetAPI().setLevelPercentage( this.device.getData().id, parseInt( value ) );
	}
}