import { BaseDevice } from "../../lib/BaseDevice";
import { CapabilityDefinition } from "../../types/CapabilityDefinition";
import { CapabilityType } from "../../types/CapabilityType";
import { CapabilityListener } from "../../types/CapabilityListener";
import { FritzApiBlind } from "../../types/FritzApi";
import { Capability } from "../../types/Capability";

class Device extends BaseDevice
{
	// TODO: create mode, end_set capability

	protected CapabilityDefinitions(): CapabilityDefinition
	{
		return {
			'availability': { state: 'present', type: CapabilityType.Boolean, hidden: true },
			'blind_mode': { state: 'blind.mode', type: CapabilityType.String, valueFunc: this.translateBlindMode },
			'end_position_set': { state: 'blind.endpositionsset', type: CapabilityType.Boolean, hidden: true },
			'windowcoverings_set': {},
		}
	}

	protected CapabilityListener(): CapabilityListener|null
	{
		return {
			'windowcoverings_set': this.setBlindLevel,
			'button.open': this.open,
			'button.close': this.close,
			'button.stop': this.stop
		}
	}

	protected async UpdateProperty( name: string, capability: Capability, value: any ): Promise<void>
	{
		if( name === 'windowcoverings_set' )
		{
			// TODO: implement
		}

		return super.UpdateProperty( name, capability, value );
	}

	private translateBlindMode( state: string ): string
	{
		if( state === 'auto' )
		{
			return this.homey.__( 'Rollo.AutoMode' );
		}
		if( state === 'manuell' )
		{
			return this.homey.__( 'Rollo.ManualMode' );
		}

		return this.homey.__( 'Rollo.UnknownMode' );
	}

	protected async capabilityChanged( name: string, value: any, oldValue: any )
	{
		if( name === 'end_position_set' )
		{
			const valid = value !== null && Boolean( value );

			if( valid )
			{
				await this.unsetWarning();
			}
			else
			{
				await this.setWarning( this.homey.__( 'Rollo.NoEndPos' ) );
			}

			return;
		}

		return super.capabilityChanged( name, value, oldValue );
	}

	private setBlindLevel( value: any )
	{
		this.log( 'send setLevelPercentage: ' + parseInt( value ) );
		this.api.setLevelPercentage( this.getData().id, parseInt( value ) );
	}

	private open()
	{
		this.log( 'send open' );
		this.api.setBlind( this.getData().id, FritzApiBlind.Open );
	}

	private close()
	{
		this.log( 'send close' );
		this.api.setBlind( this.getData().id, FritzApiBlind.Close );
	}

	private stop()
	{
		this.log( 'send stop' );
		this.api.setBlind( this.getData().id, FritzApiBlind.Stop );
	}
}

module.exports = Device;
