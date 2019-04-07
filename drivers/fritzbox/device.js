'use strict';

const BaseDevice = require('../../lib/baseDevice');
const LOG = require('../../lib/logWrapper' );

class FritzboxDevice extends BaseDevice
{
	Init( deviceData )
	{
		this.UPDATE_AVAILABLE   = 'data.fritzos.isUpdateAvail';
		this.OS_VERSION         = 'data.fritzos.nspver';

		if( deviceData === null ) return;
		this.UpdateProperty( this.UPDATE_AVAILABLE, deviceData[this.UPDATE_AVAILABLE] );
		this.UpdateProperty( this.OS_VERSION, deviceData[this.OS_VERSION] );
	}

	UpdateAvailability( deviceData )
	{
		if( deviceData === null )
		{
			this.setUnavailable();
			return;
		}

		this.setAvailable();
	}

	UpdateProperty( key, value )
	{
		switch( key )
		{
			case this.UPDATE_AVAILABLE:
				this.updateCapabilityBoolean( value, 'measure_update_available' );
				break;

			case this.OS_VERSION:
				this.updateCapabilityString( value, 'measure_os_version' );
				break;
		}
	}
}

module.exports = FritzboxDevice;