'use strict';

// libs
const Homey = require('homey');
const LOG = require('./lib/logWrapper' );
const API = require('./lib/fritzAPI');

// define error helper
if( !( 'toJSON' in Error.prototype ) )
{
	Object.defineProperty( Error.prototype, 'toJSON', {
		value: function()
		{
			const alt = {};

			Object.getOwnPropertyNames( this ).forEach( function( key )
			{
				alt[key] = this[key];
			}, this );

			return alt;
		},
		configurable: true,
		writable: true
	} )
}

const Settings = Homey.ManagerSettings;
class FritzboxBridge extends Homey.App
{
	onInit()
	{
		// init log system
		LOG.init( this.log, this.getLogLevel( Settings.get( 'loglevel' ) || 2 ), { systemcopy: true } );

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
				if( Value != false )
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
				LOG.setLevel( this.getLogLevel( Value ) );
				break;
		}
	}

	initFritzAPI()
	{
		let IP 			= Settings.get( 'fritzboxip' ) || 'http://fritz.box';
		let username    = Settings.get( 'username' ) || '';
		let password	= Settings.get( 'password' ) || '';
		let strictSSL	= Settings.get( 'strictssl' ) || false;
		let polling     = Settings.get( 'pollinginterval' ) || 60;
		let spolling    = Settings.get( 'statuspollinginterval' || 60 );

		// clear running polling before change
		API.StopPolling();

		// use browser login to get sid
		API.Create( username, password, IP, strictSSL );

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
			let Info = null;
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
				LOG.debug( 'login failed: ' + JSON.stringify( error ) );

				if( API.validate( error ) && API.validate( error.error ) && API.validate( error.error.code ) )
                {
                	let code = error.error.code;
                	if( code === 'ETIMEDOUT' )
	                {
	                	Info = 'reason: timeout -> invalid url or no (direct) connection ?';
                        LOG.warn( Info );
	                }
                	else if( code === 'ENOTFOUND' )
	                {
	                	Info = 'reason: not found -> invalid url ?';
		                LOG.error( Info );
	                }
                	else if( code === 'DEPTH_ZERO_SELF_SIGNED_CERT' )
	                {
	                	Info = 'reason: self signed cert -> disable STRICT SSL';
		                LOG.error( Info );
	                }
                }
				else if( API.validate( error ) && API.validate( error.response ) && API.validate( error.response.statusCode ) )
				{
					if( error.response.statusCode === 503 )
					{
						Info = 'reason: fritzbox web server has crashed -> restart your fritzbox ( update to 7.20 to fix )';
						LOG.error( Info );
					}
					else
					{
						Info = 'reason: unknown ( details in log )';
						LOG.error( 'reason: unknown: ' + JSON.stringify( error.response ) );
					}
				}
				else if( error === '0000000000000000' )
				{
					Info = 'reason: login refused -> invalid username/password ?';
					LOG.error( Info );
				}
				else
				{
					LOG.error( 'login failed' );
				}
				// store info for config page
				if( Info !== null )
				{
					Settings.set( 'validationInfo', Info );
				}
				Settings.set( 'validation', 0 );
			} );
		}, 100 );
	}

	getLogLevel( logValue )
	{
		let IntNumber = parseInt( logValue );
		switch( IntNumber )
		{
			case 0:
				return LOG.OFF;
			case 1:
				return LOG.ERROR;
			case 2:
				return LOG.WARN;
			case 3:
				return LOG.INFO;
			case 4:
				return LOG.DEBUG;
			case 5:
				return LOG.TRACE;
			default:
				return LOG.ERROR;
		}
	}
}

module.exports = FritzboxBridge;
