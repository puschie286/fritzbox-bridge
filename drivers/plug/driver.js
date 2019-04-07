'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class PlugDriver extends BaseDriver
{
	GetFunctionmask()
	{
		return API.CONST_ENERGYMETER | API.CONST_OUTLET;
	}

	GetFilterList()
	{
		return [
			'present',
			'switch.state',
			'switch.mode',
			'switch.devicelock',
			'switch.lock',
			'powermeter.power',
			'powermeter.voltage',
			'powermeter.energy'
		];
	}

	GetName()
	{
		return '(G)Plug';
	}

	GetDataVersion()
	{
		return 7;
	}
}

module.exports = PlugDriver;