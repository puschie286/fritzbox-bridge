import { BaseFeature } from "../lib/BaseFeature";
import { Capability } from "../types/Capability";
import { CapabilityType } from "../types/CapabilityType";
import { CapabilityListener } from "../types/CapabilityListener";
import { FritzApiBlind } from "../types/FritzApi";

export class Blind extends BaseFeature
{
	private readonly EndPositionSet: string = 'end_position_set';
	private validEndPosition: boolean = true;

	Capabilities(): Array<Capability>
	{
		return [ {
			name: 'blind_mode', state: 'blind.mode', type: CapabilityType.String, valueFunc: this.translateBlindMode.bind( this )
		}, {
			name: this.EndPositionSet, state: 'blind.endpositionsset', type: CapabilityType.Boolean, hidden: true
		}, {
			name: 'windowcoverings_set', state: 'levelcontrol.levelpercentage', options: { min: 0, max: 100, step: 1 }
		}, ];
	}

	Listeners(): Array<CapabilityListener>
	{
		return [ {
			name: 'windowcoverings_set', callback: this.setBlindLevel
		}, {
			name: 'button.open', callback: this.open
		}, {
			name: 'button.close', callback: this.close
		}, {
			name: 'button.stop', callback: this.stop
		} ];
	}

	protected async OnCapabilityUpdate( capability: Capability, value: any ): Promise<void>
	{
		if( capability.name !== this.EndPositionSet )
		{
			return super.OnCapabilityUpdate( capability, value );
		}

		await this.updateEndPositionState( value !== null && Boolean( value ) );
	}

	private async updateEndPositionState( value: boolean )
	{
		if( this.validEndPosition === value )
		{
			return;
		}

		this.validEndPosition = value;

		if( value )
		{
			await this.device.unsetWarning();
		} else
		{
			await this.device.setWarning( this.device.homey.__( 'Rollo.NoEndPos' ) );
		}
	}

	private translateBlindMode( state: string ): string
	{
		if( state === 'auto' )
		{
			return this.device.homey.__( 'Rollo.AutoMode' );
		}
		if( state === 'manuell' )
		{
			return this.device.homey.__( 'Rollo.ManualMode' );
		}

		return this.device.homey.__( 'Rollo.UnknownMode' );
	}

	private setBlindLevel( value: any )
	{
		this.device.log( 'send setLevelPercentage: ' + parseInt( value ) );
		this.device.GetAPI().setLevelPercentage( this.device.getData().id, parseInt( value ) );
	}

	private open()
	{
		this.device.log( 'send open' );
		this.device.GetAPI().setBlind( this.device.getData().id, FritzApiBlind.Open );
	}

	private close()
	{
		this.device.log( 'send close' );
		this.device.GetAPI().setBlind( this.device.getData().id, FritzApiBlind.Close );
	}

	private stop()
	{
		this.device.log( 'send stop' );
		this.device.GetAPI().setBlind( this.device.getData().id, FritzApiBlind.Stop );
	}
}
