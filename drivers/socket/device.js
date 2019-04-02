'use strict';

const API = require('../../lib/fritzAPI');
const BaseDevice = require('../../lib/baseDevice');

class SocketDevice extends BaseDevice
{
	Init( deviceData )
	{
		this.registerListener( 'onoff', this.onOnOff );

		this.STATE          = 'switch.state';
		this.MODE           = 'switch.mode';
		this.LOCK_DEVICE    = 'switch.devicelock';
		this.LOCK_API       = 'switch.lock';

		let data = deviceData.switch;
		this.UpdateProperty( this.STATE, data.state );
		this.UpdateProperty( this.MODE, this.getBooleanFromMode( data.mode ) );
		this.UpdateProperty( this.LOCK_DEVICE, data.devicelock );
	}

	getBooleanFromMode( mode )
	{
		return mode === 'auto';
	}

	async onOnOff( value )
	{
		let Value = Boolean( value );
		this.log( 'send onOff: ', Value );
		if( Value )
		{
			API.Get().setSwitchOn( this.getData().id );
		}
		else
		{
			API.Get().setSwitchOff( this.getData().id );
		}
		return Promise.resolve();
	}

	UpdateProperty( key, value )
	{
		switch( key )
		{
			case this.STATE:
				this.updateCapabilityBoolean( value, 'onoff' );
				break;

			case this.MODE:
				this.updateCapabilityBoolean( this.getBooleanFromMode( value ), 'measure_switch_mode' );
				break;

			case this.LOCK_DEVICE:
				this.updateCapabilityBoolean( value, 'measure_device_locked' );
				break;

			case this.LOCK_API:
				this.updateCapabilityBoolean( value, 'measure_api_locked' );
				break;
		}
	}

}

module.exports = SocketDevice;