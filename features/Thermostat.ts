import { BaseFeature } from "../lib/BaseFeature";
import { Capability } from "../types/Capability";
import { CapabilityType } from "../types/CapabilityType";
import { Clamp, Round } from "../lib/Helper";
import { CapabilityListener } from "../types/CapabilityListener";

export class Thermostat extends BaseFeature
{
	Capabilities(): Array<Capability>
	{
		return [ {
			name: 'measure_device_locked', state: 'hkr.devicelock', type: CapabilityType.Boolean
		}, {
			name: 'measure_api_locked', state: 'hkr.lock', type: CapabilityType.Boolean
		}, {
			name: 'measure_open_window', state: 'hkr.windowopenactiv', type: CapabilityType.Boolean
		}, {
			name: 'measure_battery_low', state: 'hkr.batterylow', type: CapabilityType.Boolean
		}, {
			name: 'measure_battery', state: 'hkr.battery', type: CapabilityType.Integer
		}, {
			name: 'measure_temperature',
			state: 'hkr.tist',
			type: CapabilityType.Integer,
			valueFunc: Thermostat.HalfValue
		}, {
			name: 'measure_temperature.night',
			state: 'hkr.absenk',
			type: CapabilityType.Integer,
			valueFunc: Thermostat.HalfValue,
			options: {
				"title": {
					"en": "Fritzbox: night temperature", "de": "Fritzbox: Spartemperatur"
				}
			}
		}, {
			name: 'measure_temperature.komfort',
			state: 'hkr.komfort',
			type: CapabilityType.Integer,
			valueFunc: Thermostat.HalfValue,
			options: {
				"title": {
					"en": "Fritzbox: comfort temperature", "de": "Fritzbox: Komforttemperatur"
				}
			}
		}, {
			name: 'measure_device_error', state: 'hkr.errorcode', type: CapabilityType.Integer, valueFunc: this.HandleError.bind( this ),
		}, {
			name: 'target_temperature',
			state: 'hkr.tsoll',
			type: CapabilityType.Integer,
			valueFunc: Thermostat.ClampTemperature,
			options: {
				"min": 8,
				"max": 28,
				"step": 0.5
			}
		} ];
	}

	Listeners(): Array<CapabilityListener>
	{
		return [ { name: 'target_temperature', callback: this.onTargetTemperature } ]
	}

	/*if( name === 'target_temperature' && ( value === 254 || value === 253 ) )
{
	//await this.updateCapability( 'onoff', value === 254 );
	return;
}*/

	/*private onOnOff( value: any )
	{
		let Value = Boolean( value );
		this.log( 'send onOff: ', Value );
		this.api.setTempTarget( this.getData().id, Value );
	}*/
	private onTargetTemperature( value: any )
	{
		this.device.log( 'send setTarget: ' + parseFloat( value ) );
		this.device.GetAPI().setTempTarget( this.device.getData().id, parseFloat( value ) );
	}

	private static HalfValue( value: number | null ): number | null
	{
		if( value === null )
		{
			return null;
		}

		return value / 2;
	}

	private OnOffValues( value: any ): boolean | null
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

	private static ClampTemperature( value: number | null ): number | null
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
			await this.device.unsetWarning();
			return this.device.homey.__( 'ThermostatError.ErrorCode' + error );
		} else
		{
			const text = this.device.homey.__( 'ThermostatError.ErrorCode' + error );
			await this.device.setWarning( text );
			return text;
		}
	}

}
