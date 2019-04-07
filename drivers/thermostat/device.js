'use strict';

const Homey = require( 'homey' );
const API = require('../../lib/fritzAPI');
const BaseDevice = require('../../lib/baseDevice');

// TODO: add support for: [ nextchange:{ endperiod: 'timestamp', tchange: 'target tmp' }, summeractive: '0', holidayactive: '' ]

class ThermostatDevice extends BaseDevice
{
	Init( deviceData )
	{
		this.registerListener( 'target_temperature', this.onTargetTemperature );
		this.registerListener( 'onoff', this.onOnOff );

		this.TEMP_MEASURE   = 'hkr.tist';
		this.TEMP_TARGET    = 'hkr.tsoll';
		this.TEMP_KOMFORT   = 'hkr.komfort';
		this.TEMP_NIGHT     = 'hkr.absenk';
		this.BATTERY        = 'hkr.battery';
		this.BATTERY_LOW    = 'hkr.batterylow';
		this.WINDOW_OPEN    = 'hkr.windowopenactiv';
		this.LOCK_API       = 'hkr.lock';
		this.LOCK_DEVICE    = 'hkr.devicelock';
		this.ERROR          = 'hkr.errorcode';

		if( deviceData === null ) return;
		this.UpdateProperty( this.TEMP_TARGET, deviceData[this.TEMP_TARGET], true, deviceData[this.TEMP_MEASURE] );
		this.UpdateProperty( this.TEMP_MEASURE, deviceData[this.TEMP_MEASURE] );
		this.UpdateProperty( this.TEMP_KOMFORT, deviceData[this.TEMP_KOMFORT] );
		this.UpdateProperty( this.TEMP_NIGHT, deviceData[this.TEMP_NIGHT] );
		this.UpdateProperty( this.BATTERY, deviceData[this.BATTERY] );
		this.UpdateProperty( this.LOCK_DEVICE, deviceData[this.LOCK_DEVICE] );
		this.UpdateProperty( this.WINDOW_OPEN, deviceData[this.WINDOW_OPEN] );
		this.UpdateProperty( this.BATTERY_LOW, deviceData[this.BATTERY_LOW] );
		this.UpdateProperty( this.LOCK_API, deviceData[this.LOCK_API] );
		this.UpdateProperty( this.ERROR, deviceData[this.ERROR] || '0' );
	}

	async onTargetTemperature( value )
	{
		this.log( 'send setTarget: ' + parseFloat( value ) );
		API.Get().setTempTarget( this.getData().id, parseFloat( value ) );
		return Promise.resolve();
	}

	async onOnOff( value )
	{
		let Value = Boolean( value );
		this.log( 'send onOff: ', Value );
		API.Get().setTempTarget( this.getData().id, Value );
		return Promise.resolve();
	}

	handleSpecialCodes( value )
	{
		let Value = Number.parseInt( value );

		if( Value === 254 )
		{
			this.updateCapabilityBoolean( true, 'onoff' );
			return true;
		}

		if( Value === 253 )
		{
			this.updateCapabilityBoolean( false, 'onoff' );
			return true;
		}

		return false;
	}

	UpdateProperty( key, value, force, value2 )
	{
		switch( key )
		{
			case this.TEMP_MEASURE:
				this.updateCapabilityNumber( value, 'measure_temperature', 0.5 );
				break;

			case this.TEMP_TARGET:
				// check for special codes
				if( !this.handleSpecialCodes( value ) )
				{
					if( force ) this.updateCapabilityBoolean( true, 'onoff' );
					// if not we have valid codes
					this.updateCapabilityNumber( value, 'target_temperature', 0.5, 4, 35, 0.01 );
				}
				else if( force )
				{
					// note: we dont know the temp_target when special codes are used so we set the temp_measure value
					this.updateCapabilityNumber( value2, 'target_temperature' );
				}
				break;

			case this.TEMP_KOMFORT:
				this.updateCapabilityNumber( value, 'measure_temperature.komfort', 0.5 );
				break;

			case this.TEMP_NIGHT:
				this.updateCapabilityNumber( value, 'measure_temperature.night', 0.5 );
				break;

			case this.BATTERY:
				this.updateCapabilityNumber( value, 'measure_battery' );
				break;

			case this.BATTERY_LOW:
				this.updateCapabilityBoolean( value, 'measure_battery_low' );
				break;

			case this.WINDOW_OPEN:
				this.updateCapabilityBoolean( value, 'measure_open_window' );
				break;

			case this.ERROR:
				this.updateCapabilityString( this.getErrorText( value ), 'measure_device_error' );
				break;

			case this.LOCK_DEVICE:
				this.updateCapabilityBoolean( value, 'measure_device_locked' );
				break;

			case this.LOCK_API:
				this.updateCapabilityBoolean( value, 'measure_api_locked' );
				break;
		}
	}

	getErrorText( code )
	{
		let Value = Number.parseInt( code );

		// validate
		if( Value < 0 || Value > 6 )
			return 'Invalid code: ' + code;

		return Homey.__( 'ErrorCode' + Value.toString() );
	}
}

module.exports = ThermostatDevice;