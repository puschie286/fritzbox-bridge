'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

const ThermostatV0 = require('./deviceV0' );


class ThermostatDriver extends BaseDriver
{
	GetFunctionmask()
	{
		return API.CONST_THERMOSTAT;
	}

	GetDeviceClass( version )
	{
		return ThermostatV0;
	}

	GetVersion()
	{
		return 0;
	}
}

module.exports = ThermostatDriver;