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
		LOG.init( this.log );

		LOG.info( 'start Fritzbox Bridge' );

		// setup hooks
		Settings.on('set', this.updateSettings.bind( this ) );

		// configure api
		this.initFritzAPI();

		// register flow stuff
		this.registerListener();
	}

	updateSettings( name )
	{
		let Value = Settings.get(name);
		switch( name )
		{
			case 'password':
			case 'fritzboxip':
			case 'strictssl':
				this.initFritzAPI();
				break;

			case 'pollinginterval':
				API.StartPolling( Value * 1000 );
				break;

			case 'pollingactive':
				let BoolValue = Value != false;
				if( BoolValue )
				{
					API.StartPolling( Settings.get( 'pollinginterval' ) * 1000 );
				}
				else
				{
					API.StopPolling();
				}
				break;
		}
	}

	initFritzAPI()
	{
		let IP 			= Settings.get( 'fritzboxip' ) || 'http://fritz.box';
		let password	= Settings.get( 'password' ) || '';
		let strictssl	= Settings.get( 'strictssl' );
		let polling     = Settings.get( 'pollinginterval' ) || 0;

		// clear running polling before change
		API.StopPolling();

		// use browser login to get sid
		API.Create( password, IP, strictssl );

		// (lazy) validate login
		this.validateLogin( polling * 1000 );
	}

	validateLogin( pollinterval )
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
			API.Get().getOSVersion().then( function( os )
			{
				LOG.debug( 'validate login: success' );
				Settings.set( 'validation', 1 );

				if( Settings.get( 'pollingactive' ) )
				{
					API.StartPolling( pollinterval );
				}

				// DEBUG device list
				/*API.Get().getGuestWlan().then( function( wlan )
				{
					LOG.debug( wlan );
					LOG.debug( 'guest wlan: ' + JSON.stringify( wlan ) );
				} );*/
			} ).catch( function( error )
			{
				LOG.debug( 'validate login: failed' );
				Settings.set( 'validation', 0 );
			} );
		}, 100 );
	}

	registerListener()
	{
		// global token
		let OSVersion = new Homey.FlowToken( 'os_version',
		{
			type: 'string',
			title: 'OS Version',
			example: '6.3.1'
		});

		// register
		OSVersion.register().then( function()
		{
			return API.Get().getOSVersion().then( ( version ) =>
			{
				return OSVersion.setValue( version );
			}).catch( function( error )
			{
				return OSVersion.setValue( 'invalid' );
			});
		}).catch( this.error );
	}
}

module.exports = FritzboxBridge;