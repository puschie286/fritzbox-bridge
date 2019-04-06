'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class ThermostatDriver extends BaseDriver
{
	GetFunctionmask()
	{
		return API.CONST_THERMOSTAT;
	}

	GetFilterList()
	{
		return [
			'present',
			'hkr.tist',
			'hkr.tsoll',
			'hkr.komfort',
			'hkr.absenk',
			'hkr.battery',
			'hkr.batterylow',
			'hkr.windowopenactiv',
			'hkr.lock',
			'hkr.devicelock',
			'hkr.errorcode'
		];
	}

	GetName()
	{
		return 'Thermostat';
	}
}

module.exports = ThermostatDriver;