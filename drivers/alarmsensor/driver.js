'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class AlarmsensorDriver extends BaseDriver {
	
	Init()
	{
		return API.CONST_ALARM;
	}

	GetName()
	{
		return 'Alarm sensor';
	}

}

module.exports = AlarmsensorDriver;