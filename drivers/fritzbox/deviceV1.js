'use strict';

const BaseDevice = require('../../lib/baseDevice');

class FritzboxDevice extends BaseDevice
{
	ValueCapabilityAssignment()
	{
		return {
			'os_version': [ 'data.fritzos.nspver', 'string' ],
			'alert_update_available': [ 'data.fritzos.isUpdateAvail', 'boolean' ]
		};
	}
}

module.exports = FritzboxDevice;