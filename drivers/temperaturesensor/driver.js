'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

const TemperatursensorV0 = require('./deviceV0' );

class TemperatursensorDriver extends BaseDriver
{
	GetFunctionmask()
	{
		return API.CONST_TEMPERATURESENSOR;
	}

	GetDeviceClass( version )
	{
		return TemperatursensorV0;
	}

	GetVersion()
	{
		return 0;
	}
}

module.exports = TemperatursensorDriver;