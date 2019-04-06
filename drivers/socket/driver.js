'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class SocketDriver extends BaseDriver
{
	GetFunctionmask()
	{
		return API.CONST_OUTLET;
	}

	GetFilterList()
	{
		return [
			'present',
			'switch.state',
			'switch.mode',
			'switch.devicelock',
			'switch.lock'
		];
	}

	GetName()
	{
		return 'Outlet';
	}
}

module.exports = SocketDriver;