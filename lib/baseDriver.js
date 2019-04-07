'use strict';

const Homey = require( 'homey' );
const API = require('./fritzAPI');
const LOG = require('./logWrapper' );

class BaseDriver extends Homey.Driver
{
	onInit()
	{
		LOG.info( 'load driver: ' + this.GetName() );

		// was GetFunctionmask implemented ?
		if( this.GetFunctionmask() === null )
		{
			LOG.error( 'driver init failed ( ' + this.constructor.name +' ) - no functionmask' );
			return;
		}

		// was GetFilterList implemented ?
		if( this.GetFilterList() === null )
		{
			LOG.error( 'driver init failed ( ' + this.constructor.name + ' ) - no filter list' );
			return;
		}
		this.log( '...completed ( ' + this.GetFunctionmask() + ' )' );
	}

	onPairListDevices( data, callback )
	{
		if( this.GetFunctionmask() === null || this.GetFilterList() === null )
		{
			callback( new Error( 'Invalid driver' ) );
			return;
		}

		if( Homey.ManagerSettings.get( 'validation' ) !== 1 )
		{
			callback( new Error( 'Invalid login - cant request device list' ) );
			return;
		}

		LOG.debug( 'request device list for: ' + this.constructor.name );

		let ShowDisconnected = Homey.ManagerSettings.get( 'showunconnected' ) === true;

		API.Get().getDeviceList().then( function( list )
		{
			let DeviceFounded = [];
			API.FilterDevices( list, this.GetFunctionmask() ).forEach( function( entry )
			{
				// check if device is connected
				if( !ShowDisconnected && !Boolean( entry.present ) ) return;

				let Device = {
					name: entry.name + ' - ' + this.GetName(),
					data: { id: entry.identifier, type: this.GetFunctionmask() },
					store: { 'data': API.CopyProperties( entry, this.GetFilterList() ) },
				};

				DeviceFounded.push( Device );
			}.bind( this ) );

			callback( null, DeviceFounded );
		}.bind( this ) ).catch( function( error )
		{
			LOG.debug( 'failed to load device list: ' + error );
			callback( new Error( 'Failed to load device list' ) );
		} );
	}

	// virtual functions
	GetFunctionmask() { return null; }

	GetFilterList() { return null; }

	GetName()
	{
		return 'Unknown';
	}
}

module.exports = BaseDriver;