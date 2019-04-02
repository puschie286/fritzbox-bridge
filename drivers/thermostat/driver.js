'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class ThermostatDriver extends BaseDriver
{
	Init()
	{
		return API.CONST_THERMOSTAT;
	}

	GetName()
	{
		return 'Thermostat';
	}
}

module.exports = ThermostatDriver;