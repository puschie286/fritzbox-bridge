'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

class TemperatursensorDriver extends BaseDriver
{
	GetFunctionmask()
	{
		return API.CONST_TEMPERATURESENSOR;
	}

	GetFilterList()
	{
		return [
			'present',
			'temperature.offset',
			'temperature.celsius'
		];
	}

	GetName()
	{
		return 'Temperature sensor';
	}
}

module.exports = TemperatursensorDriver;