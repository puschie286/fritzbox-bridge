'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class EnergymeterDriver extends BaseDriver {
	
	GetFunctionmask()
	{
		return API.CONST_ENERGYMETER;
	}

	GetFilterList()
	{
		return [
			'present',
			'powermeter.power',
			'powermeter.voltage',
			'powermeter.energy'
		];
	}

	GetName()
	{
		return 'Energymeter';
	}
}

module.exports = EnergymeterDriver;