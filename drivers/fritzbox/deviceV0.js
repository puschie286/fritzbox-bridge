'use strict';

const BaseDevice = require('../../lib/baseDevice');

class FritzboxV0 extends BaseDevice
{
	ValueCapabilityAssignment()
	{
		return {
			'measure_os_version': [ 'data.fritzos.nspver', 'string' ],
			'measure_update_available': [ 'data.fritzos.isUpdateAvail', 'boolean' ]
		};
	}
}

module.exports = FritzboxV0;