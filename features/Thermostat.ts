import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';
import { Clamp, Round } from '../lib/Helper';
import { CapabilityListener } from '../types/CapabilityListener';

export class Thermostat extends BaseFeature
{
	private static HalfValue( value: number | null ): number | null
	{
		if( value === null )
		{
			return null;
		}

		if( value == 253 || value === 254 )
		{
			return null;
		}

		return value / 2;
	}

	private static ClampTemperature( value: number | null ): number | null
	{
		if( value === null )
		{
			return null;
		}

		if( value == 253 || value === 254 )
		{
			return null;
		}

		return Round( Clamp( value / 2, 4, 35 ), 0.01 )
	}

	private static OnOffState( value: number | null ): boolean | null
	{
		if( value === null )
		{
			return null;
		}

		return value !== 253;
	}

	async LateInit(): Promise<void>
	{
		await super.LateInit();

		// set batteries for thermostat
		return this.device.setEnergy( {
			batteries: [ "AA", "AA" ]
		} );
	}

	/*if( name === 'target_temperature' && ( value === 254 || value === 253 ) )
{
	//await this.updateCapability( 'onoff', value === 254 );
	return;
}*/

	protected Capabilities(): Array<Capability>
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
				'title': {
					'en': 'Fritzbox: night temperature', 'de': 'Fritzbox: Spartemperatur'
				}
			}
		}, {
			name: 'measure_temperature.komfort',
			state: 'hkr.komfort',
			type: CapabilityType.Integer,
			valueFunc: Thermostat.HalfValue,
			options: {
				'title': {
					'en': 'Fritzbox: comfort temperature', 'de': 'Fritzbox: Komforttemperatur'
				}
			}
		}, {
			name: 'measure_device_error',
			state: 'hkr.errorcode',
			type: CapabilityType.Integer,
			valueFunc: this.HandleError.bind( this )
		}, {
			name: 'target_temperature',
			state: 'hkr.tsoll',
			type: CapabilityType.Integer,
			valueFunc: Thermostat.ClampTemperature,
			options: {
				'min': 8, 'max': 28, 'step': 0.5
			}
		}, {
			name: 'onoff',
			state: 'hkr.tsoll',
			type: CapabilityType.Integer,
			valueFunc: Thermostat.OnOffState
		} ];
	}

	public override Listeners(): Array<CapabilityListener>
	{
		return [ {
			name: 'target_temperature', callback: this.onTargetTemperature,
		}, {
			name: 'onoff', callback: this.onOnOff
		} ];
	}

	private async onOnOff( value: any )
	{
		let Value = Boolean( value );
		this.device.log( 'send onOff: ', Value );
		await this.device.GetAPI().setTempTarget( this.device.getData().id, Value );
	}

	private async onTargetTemperature( value: any )
	{
		this.device.log( 'send setTarget: ' + parseFloat( value ) );
		await this.device.GetAPI().setTempTarget( this.device.getData().id, parseFloat( value ) );
	}

	private async HandleError( error: any ): Promise<string>
	{
		if( error === undefined || error === 0 )
		{
			await this.device.unsetWarning();
			return this.device.homey.__( 'ThermostatError.ErrorCode' + error );
		}
		else
		{
			const text = this.device.homey.__( 'ThermostatError.ErrorCode' + error );
			await this.device.setWarning( text );
			return text;
		}
	}

}
