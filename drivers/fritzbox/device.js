'use strict';

const BaseDevice = require('../../lib/baseDevice');
const LOG = require('../../lib/logWrapper' );

class FritzboxDevice extends BaseDevice
{
	onInit()
	{
		LOG.info( 'load device: ' + this.getName() );

		let DeviceData = this.getStoreValue( 'data' );

		//TODO: set available state
		//Boolean( DeviceData.present ) ? this.setAvailable() : this.setUnavailable();

		// init device specific
		this.Init( DeviceData );

		this.log( '...completed ( ' + this.getName() + ' )' );
	}

	Init( deviceData )
	{
		this.UPDATE_AVAILABLE   = 'data.fritzos.isUpdateAvail';
		this.OS_VERSION         = 'data.fritzos.nspver';

		this.UpdateProperty( this.UPDATE_AVAILABLE, deviceData[this.UPDATE_AVAILABLE] );
		this.UpdateProperty( this.OS_VERSION, deviceData[this.OS_VERSION] );
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