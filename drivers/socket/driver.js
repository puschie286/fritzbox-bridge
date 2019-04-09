'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

const SocketV0 = require( './deviceV0' );

class SocketDriver extends BaseDriver
{
	GetFunctionmask()
	{
		return API.CONST_OUTLET;
	}

	GetDeviceClass( version )
	{
		return SocketV0;
	}

	GetVersion()
	{
		return 0;
	}
}

module.exports = SocketDriver;