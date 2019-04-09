'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

const EnergymeterV0 = require( './deviceV0' );

class EnergymeterDriver extends BaseDriver {
	
	GetFunctionmask()
	{
		return API.CONST_ENERGYMETER;
	}

	GetDeviceClass( version )
	{
		return EnergymeterV0;
	}

	GetVersion()
	{
		return 0;
	}
}

module.exports = EnergymeterDriver;