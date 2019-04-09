'use strict';

const Homey = require( 'homey' );
const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );
const LOG = require('../../lib/logWrapper' );

const FritzV0 = require( './deviceV0' );
const FritzV1 = require( './deviceV1' );

class FritzboxDriver extends BaseDriver
{
	GetFunctionmask()
	{
		return -1;
	}

	GetDeviceClass( version )
	{
		switch( version )
		{
			case 0:
				return FritzV0;

			case 1:
				return FritzV1;
		}

		// latest as backup
		return FritzV1;
	}

	GetDeviceList( data, callback )
	{
		if( Homey.ManagerSettings.get( 'validation' ) !== 1 )
		{
			callback( new Error( 'Invalid login - cant request device list' ) );
			return;
		}

		LOG.debug( 'request device list for: fritzbox' );

		API.Get().getOverviewData().then( function( data )
		{
			callback( null, [{
				name: 'Fritzbox',
				data: { id: 'fritzbox' },
				store: { version: this.GetVersion() }
			}] );
		}.bind( this ) ).catch( function( error )
		{
			LOG.debug( 'failed to load fritzbox: ' + error );
			callback( new Error( 'failed to load fritzbox' ) );
		} );
	}

	GetVersion()
	{
		return 1;
	}
}

module.exports = FritzboxDriver;