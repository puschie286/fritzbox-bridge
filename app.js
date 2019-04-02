'use strict';

// libs
const Homey = require('homey');
const API = require('./lib/fritzAPI');

const Settings = Homey.ManagerSettings;

class FritzboxBridge extends Homey.App
{
	onInit()
	{
		this.log('loading..');

		API.log = this.log;

		// setup hooks
		Settings.on('set', this.updateSettings.bind( this ) );

		// configure api
		this.initFritzAPI();

		// register flow stuff
		this.registerListener();

		this.log('...completed');
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
				if( !API.pollActive ) break;

				API.StartPolling( Value );
				break;

			case 'pollingactive':
				if( API.pollActive === Boolean( Value ) ) break;

				if( API.pollActive )
				{
					API.StopPolling();
				}
				else
				{
					API.StartPolling( Settings.get( 'pollinginterval' ) );
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
		this.validateLogin();
	}

	validateLogin()
	{

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