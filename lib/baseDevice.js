'use strict';

const Homey = require( 'homey' );
const LOG = require('./logWrapper' );

class BaseDevice extends Homey.Device
{
	onInit()
	{
		LOG.info( 'load device: ' + this.getName() + ' v' + this.getStoreValue( 'version' ) );

		if( this.ValueCapabilityAssignment() === null )
		{
			LOG.error( 'device init failed ( ' + this.constructor.name + ' ) - no value capability assignment');
			return;
		}

		let Listeners = this.CapabilityListener();
		if( Listeners === null ) return;

		let That = this;

		Object.keys( Listeners ).forEach( function( key )
		{
			That.registerCapabilityListener( key, Listeners[key].bind( this ) );
		}.bind( this ) );
	}

	onUpdate( data )
	{
		if( data === null )
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
				Value = Value.split('.').reduce( ( o, i ) => o[i], data );
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
			if( value === this.getAvailable() ) return;
			if( value )
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
		this.updateCapability( value, name );
	}

	ValueCapabilityAssignment()
	{
		return null;
	}

	CapabilityListener()
	{
		return null;
	}

	CanAddCapability( name )
	{
		return false;
	}

	// helper functions
	updateCapability( value, name )
	{
		if( !this.hasCapability( name ) )
		{
			if( this.CanAddCapability( name ) )
			{
				this.addCapability( name ).then( function()
				{
					LOG.info( 'updated device capability: ' + name );
					this.updateCapability( value, name );
				}.bind( this ).catch( function( error )
				{
					LOG.info( 'failed to add new capability' );
					LOG.error( error );
				}));
				return;
			}
			else
			{
				LOG.info( 'invalid capability ' + name + ': pls re-pair device' );
				return false;
			}
		}

		// compare value
		let OldValue = this.getCapabilityValue( name );
		if( OldValue === value ) return false;

		LOG.debug( `[${this.getName()}] update ${name} with new value ${value}` );
		// store
		this.setCapabilityValue( name, value ).catch( this.error.bind( this ) );
		return true;
	}
}

module.exports = BaseDevice;
