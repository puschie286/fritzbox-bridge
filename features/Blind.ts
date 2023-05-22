import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';
import { CapabilityListener } from '../types/CapabilityListener';
import { FritzApiBlind } from '../types/FritzApi';
import Homey from 'homey/lib/Homey';

export class Blind extends BaseFeature
{
	private endPositionWarning: string|null = null;
	private alertWarning: string|null = null;

	protected Capabilities(): Array<Capability>
	{
		return [ {
			name: 'blind_mode',
			state: 'blind.mode',
			type: CapabilityType.String,
			valueFunc: this.translateBlindMode.bind( this )
		}, {
			name: 'blind_errors',
			state: 'alert.state',
			type: CapabilityType.Integer,
			valueFunc: this.updateAlert.bind( this ),
			hidden: true
		}, {
			name: 'end_position_set',
			state: 'blind.endpositionsset',
			type: CapabilityType.Boolean,
			valueFunc: this.updateEndPositionState.bind( this ),
			hidden: true
		}, {
			name: 'button.open', options: {
				'title': { 'en': 'Open blind', 'de': 'Rollladen öffnen' }
			}, noUpdate: true
		}, {
			name: 'button.close', options: {
				'title': { 'en': 'Close blind', 'de': 'Rollladen schließen' }
			}, noUpdate: true
		}, {
			name: 'button.stop', options: {
				'title': { 'en': 'Stop blind', 'de': 'Rollladen stoppen' }
			}, noUpdate: true
		} ];
	}

	Listeners(): Array<CapabilityListener>
	{
		return [ {
			name: 'button.open', callback: this.open
		}, {
			name: 'button.close', callback: this.close
		}, {
			name: 'button.stop', callback: this.stop
		} ];
	}

	public static RegisterCards( homey: Homey )
	{
		homey.flow.getActionCard( 'blind_open' ).registerRunListener( this.OnActionOpen );
		homey.flow.getActionCard( 'blind_close' ).registerRunListener( this.OnActionClose );
		homey.flow.getActionCard( 'blind_stop' ).registerRunListener( this.OnActionStop );
	}

	private async updateAlert( value: number | null )
	{
		if( value === null  )
		{
			return;
		}

		if( value === 0 )
		{
			this.alertWarning = null;
		}
		// hindernis
		else if( ( value & 1 ) !== 0 )
		{
			this.alertWarning = this.device.homey.__( 'Rollo.ErrorObstacle' );
		}
		// overheated
		else if( ( value & 2 ) !== 0 )
		{
			this.alertWarning = this.device.homey.__( 'Rollo.ErrorTemperature' );
		}

		return this.UpdateWarning();
	}

	private async updateEndPositionState( value: boolean )
	{
		if( value )
		{
			this.endPositionWarning = null;
		}
		else
		{
			this.endPositionWarning = this.device.homey.__( 'Rollo.NoEndPos' );
		}

		return this.UpdateWarning();
	}

	private async UpdateWarning()
	{
		if( this.alertWarning !== null )
		{
			return this.device.setWarning( this.alertWarning );
		}

		if( this.endPositionWarning !== null )
		{
			return this.device.setWarning( this.endPositionWarning );
		}

		return this.device.unsetWarning();
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

	private async open()
	{
		this.device.log( 'send open' );
		await this.device.GetAPI().setBlind( this.device.getData().id, FritzApiBlind.Open );
	}

	private async close()
	{
		this.device.log( 'send close' );
		await this.device.GetAPI().setBlind( this.device.getData().id, FritzApiBlind.Close );
	}

	private async stop()
	{
		this.device.log( 'send stop' );
		await this.device.GetAPI().setBlind( this.device.getData().id, FritzApiBlind.Stop );
	}

	private static OnActionOpen( args: any, state: any )
	{
		const feature = args.device.GetFeature( Blind.name );
		feature.open();
	}

	private static OnActionStop( args: any, state: any )
	{
		const feature = args.device.GetFeature( Blind.name );
		feature.stop();
	}

	private static OnActionClose( args: any, state: any )
	{
		const feature = args.device.GetFeature( Blind.name );
		feature.close();
	}
}
