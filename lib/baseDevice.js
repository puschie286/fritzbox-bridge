'use strict';

const Homey = require( 'homey' );
const API = require('./fritzAPI');

class BaseDevice extends Homey.Device
{
	onInit()
	{
		this.log( 'loading..' );

		let DeviceData = this.getStoreValue( 'device_data' );

		// set available state
		Boolean( DeviceData.present ) ? this.setAvailable() : this.setUnavailable();

		// init device specific
		this.Init( DeviceData );

		this.log( '...completed ( ' + this.getName() + ' )' );
	}

	onUpdate( device, deviceList, otherDevices )
	{
		let oldDevice = this.getStoreValue( 'device_data' );

		let ChangedProperties = API.FilterProperty( device, oldDevice );

		this.Update( device, deviceList, otherDevices );

		Object.keys(ChangedProperties).forEach(function( key )
		{
			//this.log( 'update ' + key + ': ' + ChangedProperties[key] );

			// update present/availability
			if( key === 'present' )
			{
				Boolean( ChangedProperties[key] ) ? this.setAvailable() : this.setUnavailable();
				return;
			}

			this.UpdateProperty( key, ChangedProperties[key] );
		}.bind(this));

		this.setStoreValue( 'device_data', device );
	};

	// virtual functions
	Init( deviceData, Data )
	{

	}

	Update( device, deviceList, otherDevices )
	{

	}

	UpdateProperty( key, value )
	{

	}

	// helper functions
	updateCapabilityNumber( value, name, factor, min, max, steps )
	{
		let Value = Number.parseFloat( value ) * ( factor !== undefined ? factor : 1 );

		if( min !== undefined && max !== undefined )
		{
			Value = API.clamp( Value, min, max );
		}

		if( steps !== undefined )
		{
			Value = API.round( Value, steps );
		}

		// store
		this.setCapabilityValue( name, Value ).catch( this.error.bind( this ) );
	}

	updateCapabilityBoolean( value, name )
	{
		// no type compare here
		let Value = value != 0;

		// store
		this.setCapabilityValue( name, Value ).catch( this.error.bind( this ) );
	}

	updateCapabilityString( value, name )
	{
		let Value = String( value );

		// store
		this.setCapabilityValue( name, Value ).catch( this.error.bind( this ) );
	}

	registerListener( name, functionName )
	{
		this.registerCapabilityListener( name, functionName.bind( this ) );
	}
}

module.exports = BaseDevice;