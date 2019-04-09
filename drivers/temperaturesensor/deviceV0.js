'use strict';

const BaseDevice = require('../../lib/baseDevice');

class TemperaturesensorV0 extends BaseDevice
{
	ValueCapabilityAssignment()
	{
		return {
			'availability': [ 'present', 'boolean' ],
			'measure_temperature': [ 'temperature.celsius', 'number', ( A ) => A / 10 ],
			'measure_temperature.offset': [ 'temperature.offset', 'number', ( A ) => A / 10 ]
		}
	}
}

module.exports = TemperaturesensorV0;