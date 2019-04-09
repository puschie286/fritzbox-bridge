'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class PlugDriver extends BaseDriver
{
	GetFunctionmask()
	{
		return API.CONST_ENERGYMETER | API.CONST_OUTLET;
	}
}

module.exports = PlugDriver;