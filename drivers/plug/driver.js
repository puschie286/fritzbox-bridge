'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

const PlugV0 = require( './deviceV0' );

class PlugDriver extends BaseDriver
{
	GetFunctionmask()
	{
		return API.CONST_ENERGYMETER | API.CONST_OUTLET;
	}

	GetDeviceClass( version )
	{
		// latest as backup
		return PlugV0;
	}

	GetVersion()
	{
		return 0;
	}
}

module.exports = PlugDriver;