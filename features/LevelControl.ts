import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';
import { CapabilityListener } from '../types/CapabilityListener';

export class LevelControl extends BaseFeature
{
	protected Capabilities(): Array<Capability>
	{
		return [ {
			name: 'measure_level',
			state: 'levelcontrol.levelpercentage',
			type: CapabilityType.Integer,
			valueFunc: this.levelAdjust.bind( this )
		} ];
	}

	Listeners(): Array<CapabilityListener>
	{
		return [ {
			name: 'measure_level', callback: this.setLevel
		} ];
	}

	private levelAdjust( value: null | number ): null | number
	{
		if( value === null )
		{
			return null;
		}

		const invert = this.device.getSetting( 'invert_level_control' );
		if( invert )
		{
			return 100 - value;
		}

		return value;
	}

	private async setLevel( value: any )
	{
		const level = this.levelAdjust( parseInt( value ) );
		this.device.log( 'send setLevelPercentage: ' + level );
		await this.device.GetAPI().setLevelPercentage( this.device.getData().id, level! );
	}
}
