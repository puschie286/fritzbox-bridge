'use strict';

const BaseDevice = require('../../lib/baseDevice');

class TemperaturesensorDevice extends BaseDevice
{
	ValueCapabilityAssignment()
	{
		return {
			'availability': [ 'present', 'boolean' ],
			'measure_temperature': [ 'temperature.celsius', 'number', ( A ) => A / 10 ],
			'measure_temperature.offset': [ 'temperature.offset', 'number', ( A ) => A / 10 ]
		}
	}

	GetVersion()
	{
		return 0;
	}
}

module.exports = TemperaturesensorDevice;