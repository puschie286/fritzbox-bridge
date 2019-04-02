'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class TemperatursensorDriver extends BaseDriver
{
	Init()
	{
		return API.CONST_TEMPERATURESENSOR;
	}

	GetName()
	{
		return 'Temperature sensor';
	}
}

module.exports = TemperatursensorDriver;