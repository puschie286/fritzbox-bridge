'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class EnergymeterDriver extends BaseDriver {
	
	GetFunctionmask()
	{
		return API.CONST_ENERGYMETER;
	}
}

module.exports = EnergymeterDriver;