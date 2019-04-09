'use strict';

const API = require('../../lib/fritzAPI');
const BaseDevice = require('../../lib/baseDevice');

class PlugDevice extends BaseDevice
{
	ValueCapabilityAssignment()
	{
		return {
			'availability': [ 'present', 'boolean' ],
			'measure_switch_mode': [ 'switch.mode', 'boolean', ( A ) => String( A ) === 'auto', 'noCast' ],
			'measure_device_locked': [ 'switch.devicelock', 'boolean' ],
			'measure_api_locked': [ 'switch.lock', 'boolean' ],
			'measure_power': [ 'powermeter.power', 'number', ( A ) => A / 1000 ],
			'meter_power': [ 'powermeter.energy', 'number', ( A ) => A / 1000 ],
			'measure_voltage': [ 'powermeter.voltage', 'number', ( A ) => A / 1000 ],
			'onoff': [ 'switch.state', 'boolean' ]
		}
	}

	GetVersion()
	{
		return 0;
	}

	CapabilityListener()
	{
		return {
			'onoff': this.onOnOff
		}
	}

	async onOnOff( value )
	{
		let Value = Boolean( value );
		this.log( 'send onOff: ', Value );
		if( Value )
		{
			return API.Get().setSwitchOn( this.getData().id );
		}
		else
		{
			return API.Get().setSwitchOff( this.getData().id );
		}
	}
}

module.exports = PlugDevice;