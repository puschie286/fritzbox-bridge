'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

const AlarmsensorV0 = require( './deviceV0' );

class AlarmsensorDriver extends BaseDriver {
	
	GetFunctionmask()
	{
		return API.CONST_ALARM;
	}

	GetDeviceClass( version )
	{
		return AlarmsensorV0;
	}

	GetVersion()
	{
		return 0;
	}
}

module.exports = AlarmsensorDriver;