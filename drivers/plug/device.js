'use strict';

const API = require('../../lib/fritzAPI');
const BaseDevice = require('../../lib/baseDevice');

class PlugDevice extends BaseDevice
{
	Init( deviceData )
	{
		this.registerListener( 'onoff', this.onOnOff );

		this.STATE          = 'switch.state';
		this.MODE           = 'switch.mode';
		this.LOCK_DEVICE    = 'switch.devicelock';
		this.LOCK_API       = 'switch.lock';
		this.POWER          = 'powermeter.power';
		this.VOLTAGE        = 'powermeter.voltage';
		this.ENERGY         = 'powermeter.energy';

		if( deviceData === null ) return;
		this.UpdateProperty( this.POWER, deviceData[this.POWER] );
		this.UpdateProperty( this.VOLTAGE, deviceData[this.VOLTAGE] );
		this.UpdateProperty( this.ENERGY, deviceData[this.ENERGY] );
		this.UpdateProperty( this.STATE, deviceData[this.STATE] );
		this.UpdateProperty( this.MODE, deviceData[this.MODE] );
		this.UpdateProperty( this.LOCK_DEVICE, deviceData[this.LOCK_DEVICE] );
		this.UpdateProperty( this.LOCK_API, deviceData[this.LOCK_API] );
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
				this.updateCapabilityBoolean( value === 'auto', 'measure_switch_mode' );
				break;

			case this.LOCK_DEVICE:
				this.updateCapabilityBoolean( value, 'measure_device_locked' );
				break;

			case this.LOCK_API:
				this.updateCapabilityBoolean( value, 'measure_api_locked' );
				break;

			case this.POWER:
				this.updateCapabilityNumber( value / 1000, 'measure_power' );
				break;

			case this.ENERGY:
				this.updateCapabilityNumber( value / 1000, 'meter_power' );
				break;

			case this.VOLTAGE:
				this.updateCapabilityNumber( value / 100000, 'measure_voltage' );
				break;
		}
	}
}

module.exports = PlugDevice;