'use strict';

const Homey = require( 'homey' );
const API = require('../../lib/fritzAPI');
const BaseDevice = require('../../lib/baseDevice');

// TODO: add support for: [ nextchange:{ endperiod: 'timestamp', tchange: 'target tmp' }, summeractive: '0', holidayactive: '' ]

class ThermostatV0 extends BaseDevice
{
	ValueCapabilityAssignment()
	{
		return {
			'availability': [ 'present', 'boolean' ],
			'measure_device_locked': [ 'hkr.devicelock', 'boolean' ],
			'measure_api_locked': [ 'hkr.lock', 'boolean' ],
			'measure_open_window': [ 'hkr.windowopenactiv', 'boolean' ],
			'measure_battery_low': [ 'hkr.batterylow', 'boolean' ],
			'measure_battery': [ 'hkr.battery', 'integer' ],
			'measure_temperature': [ 'hkr.tist', 'integer', ( A ) => A / 2 ],
			'measure_temperature.night': [ 'hkr.absenk', 'integer', ( A ) => A / 2 ],
			'measure_temperature.komfort': [ 'hkr.komfort', 'integer', ( A ) => A / 2 ],
			'measure_device_error': [ 'hkr.errorcode', 'string', this.HandleError.bind( this ), 'noCast' ],
			'target_temperature': [ 'hkr.tsoll', 'integer', ( A ) => API.round( API.clamp( A / 2, 4, 35 ), 0.01 ) ]
		};
	}

	HandleError( error )
	{
		if( error === undefined || error === 0 )
		{
			this.unsetWarning();
			return Homey.__( 'ErrorCode' + error );
		}
		else
		{
			const text = Homey.__( 'ErrorCode' + error );
			this.setWarning( text );
			return 'Error ' + error;
		}
	}

	CapabilityListener()
	{
		return {
			'onoff': this.onOnOff,
			'target_temperature': this.onTargetTemperature
		}
	}

	async onTargetTemperature( value )
	{
		this.log( 'send setTarget: ' + parseFloat( value ) );
		API.Get().setTempTarget( this.getData().id, parseFloat( value ) );
		return Promise.resolve();
	}

	async onOnOff( value )
	{
		let Value = Boolean( value );
		this.log( 'send onOff: ', Value );
		return API.Get().setTempTarget( this.getData().id, Value );
	}

	UpdateProperty( name, value, type, valueFunc )
	{
		if( name === 'target_temperature' && ( value === 254 || value === 253 ) )
		{
			this.updateCapabilityBoolean( value === 254, 'onoff' );
			return;
		}

		super.UpdateProperty( name, value, type, valueFunc );
	}
}

module.exports = ThermostatV0;
