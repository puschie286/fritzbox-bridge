'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class AlarmsensorDriver extends BaseDriver {
	
	GetFunctionmask()
	{
		return API.CONST_ALARM;
	}

	GetFilterList()
	{
		return [
			'present',
			'alert.state'
		];
	}

	GetName()
	{
		return 'Alarm sensor';
	}

}

module.exports = AlarmsensorDriver;