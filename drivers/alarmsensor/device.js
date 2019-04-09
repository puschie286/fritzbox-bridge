'use strict';

const BaseDevice = require('../../lib/baseDevice');

class AlarmsensorDevice extends BaseDevice
{
	ValueCapabilityAssignment()
	{
		return {
			'availability': [ 'present', 'boolean' ],
			'alarm_generic': [ 'alert.state', 'boolean' ]
		};
	}

	GetVersion()
	{
		return 0;
	}
}

module.exports = AlarmsensorDevice;