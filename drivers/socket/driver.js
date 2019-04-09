'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class SocketDriver extends BaseDriver
{
	GetFunctionmask()
	{
		return API.CONST_OUTLET;
	}
}

module.exports = SocketDriver;