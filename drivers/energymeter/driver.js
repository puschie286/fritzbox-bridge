'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class EnergymeterDriver extends BaseDriver {
	
	Init()
	{
		return API.CONST_ENERGYMETER;
	}

	GetName()
	{
		return 'Energymeter';
	}
}

module.exports = EnergymeterDriver;