'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class ThermostatDriver extends BaseDriver
{
	GetFunctionmask()
	{
		return API.CONST_THERMOSTAT;
	}
}

module.exports = ThermostatDriver;