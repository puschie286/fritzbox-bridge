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

		let Listeners = this.CapabilityListener();
		if( Listeners === null ) return;

		Object.keys( Listeners ).forEach( function( key )
		{
			this.registerCapabilityListener( key, Listeners[key].bind( this ) );
		}.bind( this ) );
	}

	onUpdate( device )
	{
		if( device === null )
		{
			LOG.debug( 'device data not found: ' + this.getName() );
			// TODO: better handling of no data
			return;
		}

		// update each capability
		let Assignments = this.ValueCapabilityAssignment();
		Object.keys( Assignments ).forEach( ( key ) =>
		{
			let Value = Assignments[key][0];
			let Type = Assignments[key][1];
			let ValueFunc = Assignments[key][2];
			let Options = Assignments[key][3];

			if( Value !== null )
			{
				// gather data from device
				// TODO: make gathering more stable ( if property doesnt exist
				Value = Value.split('.').reduce( ( o, i ) => o[i], device );
			}

			// check for casting
			if( Options !== 'noCast' || Value === undefined )
			{
				// precast types to have valid value
				switch( Type )
				{
					case 'string':
						Value = String( Value );
						break;
					case 'integer':
						Value = parseInt( Value );
						break;
					case 'number':
						Value = parseFloat( Value );
						break;
					case 'boolean':
						Value = Value != 0;
						break;
				}

			}
			this.UpdateProperty( key, Value, Type, ValueFunc );
		} );
	};

	// default update implementation
	UpdateProperty( name, value, type, valueFunc )
	{
		// check for global state / availability
		if( name === 'availability' )
		{
			let IsAvailable = Boolean( value );
			if( IsAvailable === this.getAvailable() ) return;
			if( IsAvailable )
			{
				this.setAvailable();
				LOG.info( 'Device ' + this.getName() + ' got available' );
			}
			else
			{
				this.setUnavailable();
				LOG.info( 'Device ' + this.getName() + ' got unavailable' );
			}
			return;
		}

		// check for value function
		if( valueFunc !== undefined && valueFunc !== null )
		{
			value = valueFunc( value );
		}

		// default update routines
		switch( type )
		{
			case 'string':
				this.updateCapabilityString( value, name );
				break;

			case 'integer':
			case 'number':
				this.updateCapabilityNumber( value, name );
				break;

			case 'boolean':
				this.updateCapabilityBoolean( value, name );
				break;
		}
	}

	ValueCapabilityAssignment()
	{
		return null;
	}

	CapabilityListener()
	{
		return null;
	}

	// helper functions
	updateCapabilityNumber( value, name )
	{
		if( !this.hasCapability( name ) )
		{
			LOG.info( 'invalid capability ' + name + ': pls re-pair device' );
			return false;
		}

		// compare value
		let OldValue = this.getCapabilityValue( name );
		if( OldValue === value ) return false;

		LOG.debug( 'update ' + name + ' with new value ' + value );
		// store
		this.setCapabilityValue( name, value ).catch( this.error.bind( this ) );
		return true;
	}

	updateCapabilityBoolean( value, name )
	{
		if( !this.hasCapability( name ) )
		{
			LOG.info( 'invalid capability ' + name + ': pls re-pair device' );
			return false;
		}

		// compare
		let OldValue = this.getCapabilityValue( name );
		if( OldValue === value ) return false;

		LOG.debug( 'update ' + name + ' with new value ' + value );
		// store
		this.setCapabilityValue( name, value ).catch( this.error.bind( this ) );
		return true;
	}

	updateCapabilityString( value, name )
	{
		if( !this.hasCapability( name ) )
		{
			LOG.info( 'invalid capability ' + name + ': pls re-pair device ' + this.getName() );
			return false;
		}

		// compare
		let OldValue = this.getCapabilityValue( name );
		if( OldValue === value ) return false;

		LOG.debug( 'update ' + name + ' with new value ' + value );
		// store
		this.setCapabilityValue( name, value ).catch( this.error.bind( this ) );
		return true;
	}
}

module.exports = BaseDevice;