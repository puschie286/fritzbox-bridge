'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class TemperatursensorDriver extends BaseDriver
{
	GetFunctionmask()
	{
		return API.CONST_TEMPERATURESENSOR;
	}
}

module.exports = TemperatursensorDriver;