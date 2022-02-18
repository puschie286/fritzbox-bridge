'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

const ThermostatV0 = require('./deviceV0' );
const ThermostatV1 = require('./deviceV1' );

class ThermostatDriver extends BaseDriver
{
	GetFunctionmask()
	{
		return API.CONST_THERMOSTAT;
	}

	GetDeviceClass( version )
	{
		switch( version )
		{
			case 0:
				return ThermostatV0;
			case 1:
				return ThermostatV1
		}

		// latest as backup
		return ThermostatV1;
	}

	GetVersion()
	{
		return 1;
	}
}

module.exports = ThermostatDriver;