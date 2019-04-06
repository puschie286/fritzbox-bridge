'use strict';

const Homey = require( 'homey' );
const API = require('./fritzAPI');
const LOG = require('./logWrapper' );

class BaseDevice extends Homey.Device
{
	onInit()
	{
		LOG.info( 'load device: ' + this.getName() );

		let DeviceData = this.getStoreValue( 'data' );

		// set available state
		Boolean( DeviceData.present ) ? this.setAvailable() : this.setUnavailable();

		// init device specific
		this.Init( DeviceData );

		this.log( '...completed ( ' + this.getName() + ' )' );
	}

	onUpdate( device )
	{
		let oldDevice = this.getStoreValue( 'data' );

		let ChangedProperties = API.CompareProperties( oldDevice, device );

		Object.keys( ChangedProperties ).forEach( function( key )
		{
			LOG.debug( 'update ' + key + ': ' + ChangedProperties[key] );

			// update present/availability
			if( key === 'present' )
			{
				Boolean( ChangedProperties[key] ) ? this.setAvailable() : this.setUnavailable();
				return;
			}

			this.UpdateProperty( key, ChangedProperties[key] );
		}.bind( this ) );

		this.setStoreValue( 'data', device );
	};

	// virtual functions
	Init( deviceData )
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