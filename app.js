'use strict';

// libs
const Homey = require('homey');
const LOG = require('./lib/logWrapper' );
const API = require('./lib/fritzAPI');

const Settings = Homey.ManagerSettings;
class FritzboxBridge extends Homey.App
{
	onInit()
	{
		// init log system
		LOG.init( this.log, LOG.TRACE, { systemcopy: true } );

		LOG.info( 'start Fritzbox Bridge' );

		// setup hooks
		Settings.on('set', this.updateSettings.bind( this ) );

		// configure api
		this.initFritzAPI();
	}

	updateSettings( name )
	{
		let Value = Settings.get( name );
		switch( name )
		{
			case 'username':
			case 'password':
			case 'fritzboxip':
			case 'strictssl':
				this.initFritzAPI();
				break;

			case 'pollinginterval':
				if( Settings.get( 'validation' ) === 1 )
				{
					API.StartPolling( Value * 1000 );
				}
				break;

			case 'pollingactive':
				let BoolValue = Value != false;
				if( BoolValue )
				{
					if( Settings.get( 'validation' ) === 1 )
					{
						API.StartPolling( Settings.get( 'pollinginterval' ) * 1000 );
						API.StartStatusPolling( Settings.get( 'statuspollinginterval' ) * 1000 );
					}
				}
				else
				{
					API.StopPolling();
					API.StopStatusPolling();
				}
				break;

			case 'statuspollinginterval':
				if( Settings.get( 'validation' ) === 1 )
				{
					API.StartStatusPolling( Value * 1000 );
				}
				break;

			case 'loglevel':
				let IntNumber = parseInt( value );
				switch( IntNumber )
				{
					case 0:
						LOG.setLevel( LOG.OFF );
						break;

					case 1:
						LOG.setLevel( LOG.ERROR );
						break;

					case 2:
						LOG.setLevel( LOG.WARN );
						break;

					case 3:
						LOG.setLevel( LOG.INFO );
						break;

					case 4:
						LOG.setLevel( LOG.DEBUG );
						break;

					case 5:
						LOG.setLevel( LOG.TRACE );
						break;
				}
				break;
		}
	}

	initFritzAPI()
	{
		let IP 			= Settings.get( 'fritzboxip' ) || 'http://fritz.box';
		let username    = Settings.get( 'username' ) || '';
		let password	= Settings.get( 'password' ) || '';
		let strictssl	= Settings.get( 'strictssl' );
		let polling     = Settings.get( 'pollinginterval' ) || 0;
		let spolling    = Settings.get( 'statuspollinginterval' || 0 );

		// clear running polling before change
		API.StopPolling();

		// use browser login to get sid
		API.Create( username, password, IP, strictssl );

		// (lazy) validate login
		this.validateLogin( polling * 1000, spolling * 1000 );
	}

	validateLogin( pollinterval, statuspollinginterval )
	{
		// reset running timout
		if( this.validateTimeout !== undefined && this.validateTimeout !== null )
		{
			clearTimeout( this.validateTimeout );
			this.validateTimeout = null;
		}

		// delay validation
		this.validateTimeout = setTimeout( function()
		{
			Settings.set( 'validation', 2 );
			API.Get().getDeviceList().then( function( list )
			{
				Settings.set( 'validation', 1 );
				LOG.debug( 'validate login: success' );

				if( Settings.get( 'pollingactive' ) )
				{
					API.StartPolling( pollinterval, list );
					API.StartStatusPolling( statuspollinginterval );
				}
			} ).catch( function( error )
			{
				Settings.set( 'validation', 0 );
				if( error !== undefined && error.error !== undefined && ( error.error.code === 'ETIMEDOUT' || error.error.code === 'ENOTFOUND' ) )
                {
                    LOG.info( 'validate login: failed -> timeout' );
                    return;
                }
				LOG.debug( 'validate login: failed ' + JSON.stringify( error ) );
			} );
		}, 100 );
	}
}

module.exports = FritzboxBridge;