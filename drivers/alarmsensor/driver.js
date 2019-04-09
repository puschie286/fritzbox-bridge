'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class AlarmsensorDriver extends BaseDriver {
	
	GetFunctionmask()
	{
		return API.CONST_ALARM;
	}
}

module.exports = AlarmsensorDriver;