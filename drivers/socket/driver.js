'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class SocketDriver extends BaseDriver
{
	Init()
	{
		return API.CONST_OUTLET;
	}

	GetName()
	{
		return 'Outlet';
	}
}

module.exports = SocketDriver;