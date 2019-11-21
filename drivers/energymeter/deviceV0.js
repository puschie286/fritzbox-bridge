'use strict';

const BaseDevice = require('../../lib/baseDevice');

class EnergymeterV0 extends BaseDevice
{
	ValueCapabilityAssignment()
	{
		return {
			'availability': [ 'present', 'boolean' ],
			'measure_power': [ 'powermeter.power', 'number', ( A ) => A / 1000 ],
			'meter_power': [ 'powermeter.energy', 'number', ( A ) => A / 1000 ],
			'measure_voltage': [ 'powermeter.voltage', 'number', ( A ) => A / 1000 ],
		}
	}
}

module.exports = EnergymeterV0;