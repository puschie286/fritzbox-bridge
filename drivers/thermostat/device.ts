// TODO: add support for: [ nextchange:{ endperiod: 'timestamp', tchange: 'target tmp' }, summeractive: '0', holidayactive: '' ]

import { BaseDevice } from "../../lib/BaseDevice";
import { CapabilityDefinition } from "../../types/CapabilityDefinition";
import { CapabilityType } from "../../types/CapabilityType";
import { CapabilityOption } from "../../types/CapabilityOption";
import { Clamp, Round } from "../../lib/Helper";
import { CapabilityListener } from "../../types/CapabilityListener";
import { Capability } from "../../types/Capability";

class Device extends BaseDevice
{
	protected CapabilityDefinitions(): CapabilityDefinition
	{
		return {
			//'onoff': { state: 'hkr.tsoll', type: CapabilityType.Boolean, valueFunc: this.OnOffValues, option: CapabilityOption.NoCast },
			'availability': { state: 'present', type: CapabilityType.Boolean, hidden: true },
			'measure_device_locked': { state: 'hkr.devicelock', type: CapabilityType.Boolean },
			'measure_api_locked': { state: 'hkr.lock', type: CapabilityType.Boolean },
			'measure_open_window': { state: 'hkr.windowopenactiv', type: CapabilityType.Boolean },
			'measure_battery_low': { state: 'hkr.batterylow', type: CapabilityType.Boolean },
			'measure_battery': { state: 'hkr.battery', type: CapabilityType.Integer },
			'measure_temperature': { state: 'hkr.tist', type: CapabilityType.Integer, valueFunc: this.HalfValue },
			'measure_temperature.night': { state: 'hkr.absenk', type: CapabilityType.Integer, valueFunc: this.HalfValue },
			'measure_temperature.komfort': { state: 'hkr.komfort', type: CapabilityType.Integer, valueFunc: this.HalfValue },
			'measure_device_error': { state: 'hkr.errorcode', type: CapabilityType.String, valueFunc: this.HandleError.bind( this ), option: CapabilityOption.NoCast },
			'target_temperature': { state: 'hkr.tsoll', type: CapabilityType.Integer, valueFunc: this.ClampTemperature }
		};
	}

	private HalfValue( value: number|null ): number|null
	{
		if( value === null )
		{
			return null;
		}

		return value / 2;
	}

	private OnOffValues( value: any ): boolean|null
	{
		if( value === null )
		{
			return null;
		}

		const intValue = parseInt( value );

		if( isNaN( intValue ) )
		{
			return null;
		}

		return intValue !== 253;
	}

	private ClampTemperature( value: number|null ): number|null
	{
		if( value === null )
		{
			return null;
		}

		return Round( Clamp( value / 2, 4, 35 ), 0.01 )
	}

	private async HandleError( error: any ): Promise<string>
	{
		if( error === undefined || error === 0 )
		{
			await this.unsetWarning();
			return this.homey.__( 'ThermostatError.ErrorCode' + error );
		}
		else
		{
			const text = this.homey.__( 'ThermostatError.ErrorCode' + error );
			await this.setWarning( text );
			return text;
		}
	}

	protected CapabilityListener(): CapabilityListener
	{
		return {
			//'onoff': this.onOnOff,
			'target_temperature': this.onTargetTemperature
		}
	}

	private onTargetTemperature( value: any )
	{
		this.log( 'send setTarget: ' + parseFloat( value ) );
		this.api.setTempTarget( this.getData().id, parseFloat( value ) );
	}

	private onOnOff( value: any )
	{
		let Value = Boolean( value );
		this.log( 'send onOff: ', Value );
		this.api.setTempTarget( this.getData().id, Value );
	}

	protected async UpdateProperty( name: string, capability: Capability, value: any )
	{
		if( name === 'target_temperature' && ( value === 254 || value === 253 ) )
		{
			//await this.updateCapability( 'onoff', value === 254 );
			return;
		}

		await super.UpdateProperty( name, capability, value );
	}
}

module.exports = Device;
