'use strict';

const Homey = require( 'homey' );
const API = require('./fritzAPI');
const LOG = require('./logWrapper' );

class BaseDevice extends Homey.Device
{
	onInit()
	{
		LOG.info( 'load device: ' + this.getName() );

		if( this.ValueCapabilityAssignment() === null )
		{
			LOG.error( 'device init failed ( ' + this.constructor.name + ' ) - no value capability assignment');
			return;
		}

		if( this.GetVersion() === null )
		{
			LOG.error( 'device init failed ( ' + this.constructor.name + ' ) - no version defined');
			return;
		}
	}

	onUpdate( device )
	{
		if( device === null )
		{
			LOG.debug( 'device data not found: ' + this.getName() );
			// TODO: better handling of no data
			return;
		}

		// filter for capabilities/values
		let Values = {};
		let Assignments = this.ValueCapabilityAssignment();
		let AssignmentKeys = Object.keys( Assignments );
		AssignmentKeys.forEach( ( key ) =>
		{
			Values[key] = Assignments[key][0].split('.').reduce( ( o, i ) => o[i], device );
		} );

		AssignmentKeys.forEach( ( key ) =>
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
	};

	// virtual functions
	UpdateProperty( key, value )
	{

	}

	ValueCapabilityAssignment()
	{
		return null;
	}

	GetVersion()
	{
		return null;
	}

	// helper functions
	updateCapabilityNumber( value, name, factor, min, max, steps )
	{
		if( !this.hasCapability( name ) )
		{
			LOG.info( 'invalid capability ' + name + ': pls re-pair device' );
			return false;
		}

		let Value = Number.parseFloat( value ) * ( factor !== undefined ? factor : 1 );

		if( min !== undefined && max !== undefined )
		{
			Value = API.clamp( Value, min, max );
		}

		if( steps !== undefined )
		{
			Value = API.round( Value, steps );
		}

		// compare value
		let OldValue = this.getCapabilityValue( name );
		if( OldValue === Value ) return false;

		// store
		this.setCapabilityValue( name, Value ).catch( this.error.bind( this ) );
		return true;
	}

	updateCapabilityBoolean( value, name )
	{
		if( !this.hasCapability( name ) )
		{
			LOG.info( 'invalid capability ' + name + ': pls re-pair device' );
			return false;
		}

		// no type compare here
		let Value = value != 0;

		// compare
		let OldValue = this.getCapabilityValue( name );
		if( OldValue === Value ) return false;

		// store
		this.setCapabilityValue( name, Value ).catch( this.error.bind( this ) );
		return true;
	}

	updateCapabilityString( value, name )
	{
		if( !this.hasCapability( name ) )
		{
			LOG.info( 'invalid capability ' + name + ': pls re-pair device ' + this.getName() );
			return false;
		}

		// cast to string
		let Value = String( value );


		// compare
		let OldValue = this.getCapabilityValue( name );
		if( OldValue === Value ) return false;

		// store
		this.setCapabilityValue( name, Value ).catch( this.error.bind( this ) );
		return true;
	}

	registerListener( name, functionName )
	{
		this.registerCapabilityListener( name, functionName.bind( this ) );
	}
}

module.exports = BaseDevice;