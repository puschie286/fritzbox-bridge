'use strict';

const Homey = require( 'homey' );
const API = require('../../lib/fritzAPI');
const BaseDevice = require('../../lib/baseDevice');
const LOG = require('../../lib/logWrapper' );

// TODO: add support for: [ nextchange:{ endperiod: 'timestamp', tchange: 'target tmp' }, summeractive: '0', holidayactive: '' ]

// It's necessary to clamp this value to a minimum of 1 since the Fritz!Box sometimes gives us bogus values like the window open period end time being several minutes in the past
const endDateToMinutesLeft = ( A ) => A === 0 ? 0 : API.clamp( API.ceil((A - Math.floor(Date.now() / 1000)) / 60), 1, 24 * 60);
const endDateToMinutesLeftEnum = ( A ) => A === 0 ? 'off' : `${API.clamp(API.ceil(endDateToMinutesLeft( A ), 5), 5, 15)}minutes`;

const parseEnumOrStringOrMinutesLeft = (value) => {
	let match, numericValue;
	if (typeof value === 'string') {
		if (value === 'off') {
			numericValue = 0;
		} else if ((match = value.match(/(\d{1,3})minutes/)) !== null) {
			numericValue = parseInt(match[1]);
		} else if (value.match(/[0-9]+/)) {
			numericValue = parseInt(value);
		}
	} else if (typeof value === 'number') {
		numericValue = value;
	}
	return API.clamp(numericValue, 0, 24 * 60);
}

class ThermostatV1 extends BaseDevice
{
	ValueCapabilityAssignment()
	{
		return {
			'availability': [ 'present', 'boolean' ],
			'measure_device_locked': [ 'hkr.devicelock', 'boolean' ],
			'measure_api_locked': [ 'hkr.lock', 'boolean' ],
			'measure_open_window': [ 'hkr.windowopenactiv', 'boolean' ],
			'minutes_left_open_window': [ 'hkr.windowopenactiveendtime', 'integer',  endDateToMinutesLeft],
			'enum_minutes_left_open_window': [ 'hkr.windowopenactiveendtime', 'integer', endDateToMinutesLeftEnum ],
			'measure_boost_active': [ 'hkr.boostactive', 'boolean' ],
			'minutes_left_boost_active': [ 'hkr.boostactiveendtime', 'integer', endDateToMinutesLeft ],
			'enum_minutes_left_boost_active': [ 'hkr.boostactiveendtime', 'integer', endDateToMinutesLeftEnum ],
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
		if( error === undefined || error === 0 || error === "0" )
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
			'target_temperature': this.onTargetTemperature,
			'minutes_left_open_window': this.onMinutesLeftOpenWindow,
			'enum_minutes_left_open_window': this.onMinutesLeftOpenWindow,
			'minutes_left_boost_active': this.onMinutesLeftBoostActive,
			'enum_minutes_left_boost_active': this.onMinutesLeftBoostActive,
		}
	}

	async onTargetTemperature( value )
	{
		this.log( 'send setTarget: ' + parseFloat( value ) );
		API.Get().setTempTarget( this.getData().id, parseFloat( value ) );
		return Promise.resolve();
	}

	async onMinutesLeftOpenWindow( value )
	{
		const numericValue = parseEnumOrStringOrMinutesLeft(value);
		this.log( `send onMinutesLeftOpenWindow: ${numericValue}` );
		return API.Get().setHkrWindowOpen( this.getData().id, numericValue ).then((retVal) => {
			const intEndTime = parseInt(retVal);
			if (isNaN(intEndTime)) {
				LOG.warn(`Unexpectedly received ${JSON.stringify(retVal)} instead of a Unix timestamp`);
			}
			super.UpdateProperty('minutes_left_open_window', intEndTime, 'integer', endDateToMinutesLeft);
			super.UpdateProperty('enum_minutes_left_open_window', intEndTime, 'integer', endDateToMinutesLeftEnum);
		});
	}

	async onMinutesLeftBoostActive( value )
	{
		const numericValue = parseEnumOrStringOrMinutesLeft(value);
		this.log( `send onMinutesLeftBoostActive: ${numericValue}` );
		return API.Get().setHkrBoost( this.getData().id, numericValue ).then((retVal) => {
			const intEndTime = parseInt(retVal);
			if (isNaN(intEndTime)) {
				LOG.warn(`Unexpectedly received ${JSON.stringify(retVal)} instead of a Unix timestamp`);
			}
			super.UpdateProperty('minutes_left_boost_active', intEndTime, 'integer', endDateToMinutesLeft);
			super.UpdateProperty('enum_minutes_left_boost_active', intEndTime, 'integer', endDateToMinutesLeftEnum);
		});
	}

	async onOnOff( value )
	{
		let Value = Boolean( value );
		this.log( 'send onOff: ', Value );
		return API.Get().setTempTarget( this.getData().id, Value );
	}

	UpdateProperty( name, value, type, valueFunc )
	{		
		if( name === 'target_temperature' )
		{
			this.updateCapability( Boolean(value !== 253), 'onoff' );
			if (value === 253 || value === 254) return;
		}
		super.UpdateProperty( name, value, type, valueFunc );
	}
}

module.exports = ThermostatV1;