'use strict';

const BaseDevice = require('../../lib/baseDevice');

class AlarmsensorV0 extends BaseDevice
{
	ValueCapabilityAssignment()
	{
		return {
			'availability': [ 'present', 'boolean' ],
			'alarm_generic': [ 'alert.state', 'boolean' ]
		};
	}
}

module.exports = AlarmsensorV0;