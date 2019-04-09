'use strict';

const BaseDevice = require('../../lib/baseDevice');
const LOG = require('../../lib/logWrapper' );

class FritzboxDevice extends BaseDevice
{
	ValueCapabilityAssignment()
	{
		return {
			'measure_os_version': [ 'data.fritzos.nspver', 'string' ],
			'measure_update_available': [ 'data.fritzos.isUpdateAvail', 'boolean' ]
		};
	}

	GetVersion()
	{
		return 0;
	}
}

module.exports = FritzboxDevice;