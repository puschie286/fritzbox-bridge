'use strict';

const fritzAPI = require('fritzapi').Fritz;
const Homey = require('homey');
const LOG = require('./logWrapper' );

let APIHolder =
{
	CONST_ALARM:            1 << 4, // Alarm Sensor
	CONST_BUTTON:           1 << 5, // Button
	CONST_THERMOSTAT:       1 << 6, // Comet DECT, Heizkostenregler
	CONST_ENERGYMETER:      1 << 7, // Energie Messgerät
	CONST_TEMPERATURESENSOR:1 << 8, // Temperatursensor
	CONST_OUTLET:           1 << 9, // Schaltsteckdose
	CONST_DECTREPEATER:     1 << 10,// AVM DECT Repeater

	// internal
	fritzInstance: null,
	pollingID: null,
	pollActive: false,
	statusPollingID: null,
	statusPollActive: false,

	/**
	 * get api instance (fritzapi)
	 *
	 * @return fritzAPI
	 */
	Get: function()
	{
		return this.fritzInstance;
	},

	/**
	 * create new api instance ( set new login credential & options )
	 *
	 * @param username  fritzbox login username     ( default: no username )
	 * @param password  fritzbox login password     ( no default )
	 * @param ip        fritzbox ip address         ( default: http://fritz.box )
	 * @param ssl       enable/disable strict ssl   ( default: true )
	 */
	Create: function( username, password, ip, ssl )
	{
		// noinspection JSPotentiallyInvalidConstructorUsage
		this.fritzInstance = new fritzAPI( username, password, ip, ssl );
	},

	/**
	 * start polling with interval delay ( restart polling when active on call )
	 * min: 1000        ( 1 sec )
	 * max: 86400000    ( 1 day )
	 * @param interval  time delay between two polls in milliseconds ( default: 60000 )
	 * @param data      init data for init update
	 */
	StartPolling: function( interval, data )
	{
		let Value = Number.parseInt( interval );
		if( Value < 1000 || Value > 86400000 )
		{
			LOG.warn( 'Invalid interval - cancel polling ( ' + interval + ' => ' + Value + ' )' );
			return;
		}

		if( this.pollingID !== null )
		{
			this.StopPolling();
		}

		LOG.info( 'start polling with ' + ( Math.round( ( Value / 1000 ) * 100 ) / 100 ) + 's interval' );
		this.pollingID = setInterval( this.Poll.bind( this ), Value );

		if( !Array.isArray( data ) ) return;

		LOG.debug( 'full device list' );
		LOG.debug( JSON.stringify( data ) );

		// init with param data
		this.Internal_Poll( data );
	},

	/**
	 * start status polling with interval delay ( restart polling when active on call )
	 * min: 1000        ( 1 sec )
	 * max: 86400000    ( 1 day )
	 * @param interval  time delay between two polls in milliseconds ( default: 60000 )
	 */
	StartStatusPolling: function( interval )
	{
		let Value = Number.parseInt( interval );
		if( Value < 1000 || Value > 86400000 )
		{
			LOG.warn( 'Invalid interval - cancel status polling ( ' + interval + ' => ' + Value + ' )' );
			return;
		}

		if( this.statusPollingID !== null )
		{
			this.StopStatusPolling();
		}

		LOG.info( 'start status polling with ' + ( Math.round( ( Value / 1000 ) * 100 ) / 100 ) + 's interval' );
		this.statusPollingID = setInterval( this.StatusPoll.bind( this ), Value );
		this.StatusPoll();
	},

	/**
	 * stop active polling ( ignored when inactive on call )
	 */
	StopPolling: function()
	{
		if( this.pollingID === null ) return;

		LOG.info( 'stop polling' );
		clearInterval( this.pollingID );
		this.pollingID = null;
		this.pollActive = false;
	},

	/**
	 * stop active status polling ( ignored when inactive on call )
	 */
	StopStatusPolling: function()
	{
		if( this.statusPollingID === null ) return;

		LOG.info( 'stop status polling' );
		clearInterval( this.statusPollingID );
		this.statusPollingID = null;
		this.statusPollActive = false;
	},

	/**
	 * filter deviceList based on functionmask ( device functions )
	 *
	 * @param deviceList        list of all device objects
	 * @param functionmask      function bitmask number
	 * @return []               list of passed devices
	 */
	FilterDevices: function( deviceList, functionmask )
	{
		if( typeof functionmask !== "number" )
		{
			LOG.error( 'ERROR - functionmask invalid ', functionmask );
			return [];
		}

		let PassedDevices = [];
		if( deviceList.length > 0 )
		{
			deviceList.forEach( function( device )
			{
				// check if device contain driver function
				if( ( Number( device.functionbitmask ) & functionmask ) !== functionmask ) return;

				PassedDevices.push( device );
			});
		}
		return PassedDevices;
	},

	/**
	 * filter deviceList based on identifier ( device unique )
	 *
	 * @param deviceList        list of all device objects
	 * @param identifier        device unique identifier
	 * @return null|{}          founded device or null
	 */
	FilterDevice: function( deviceList, identifier )
	{
		if( !Array.isArray( deviceList ) || deviceList.length === 0 ) return null;

		let Device = null;
		deviceList.some( function( device )
		{
			if( device.identifier !== identifier )
				return false;

			Device = device;
			return true;
		});
		return Device;
	},

	Internal_Poll: function( data )
	{
		let Drivers = Homey.ManagerDrivers.getDrivers();
		Object.keys( Drivers ).forEach( function( key )
		{
			let driver = Drivers[key];

			// skip fritzbox driver
			if( driver.GetFunctionmask() === -1 ) return;

			let Devices = driver.getDevices();

			// skip if no devices
			if( Devices.length === 0 ) return;

			// filter specific driver
			let DriverDeviceList = this.FilterDevices( data, driver.GetFunctionmask()  );

			// update device
			Devices.forEach( function( device )
			{
				device.onUpdate( this.FilterDevice( DriverDeviceList, device.getData().id ) );
			}.bind( this ) );
		}.bind( this ) );
	},

	Internal_StatusPoll: function( data )
	{
		// TODO: check for memory performance
		Homey.ManagerDrivers.getDriver( 'fritzbox' ).getDevices().forEach( function( device )
		{
			device.onUpdate( data );
		} );
	},

	/**
	 * poll data from fritzbox
	 */
	Poll: function()
	{
		if( this.pollActive )
		{
			LOG.debug( 'Skip poll - still waiting on last poll' );
			return;
		}

		this.pollActive = true;
		this.fritzInstance.getDeviceList().then( function( deviceList )
		{
			this.pollActive = false;
			this.Internal_Poll( deviceList );
		}.bind( this ) ).catch( ( error ) => this.logPolError( error, false ) );
	},

	StatusPoll: function()
	{
		if( this.statusPollActive )
		{
			LOG.debug( 'Skip poll - still waiting on last status poll' );
			return;
		}

		this.statusPollActive = true;
		this.fritzInstance.getOverviewData().then( function( data )
		{
			this.statusPollActive = false;
			this.Internal_StatusPoll( data );
		}.bind( this ) ).catch( ( error ) => this.logPolError( error, true ) );
	},

	// helper
	logPolError: function( error, status )
	{
		if( status )
			this.statusPollActive = false;
		else
			this.pollActive = false;

		LOG.debug( 'poll failed: ' + ( status ? 1 : 0 ) );
		if( this.validate( error ) && this.validate( error.error ) && this.validate( error.error.code ) )
		{
			let code = error.error.code;
			if( code === 'ENOTFOUND' || code === 'ETIMEDOUT' )
			{
				LOG.info( 'getOverviewData timeout' );
				return;
			}
		}
		LOG.error( 'details: ' + JSON.stringify( error ) );
	},

	validate: function( object )
	{
		return object !== undefined && object !== null;
	},

	// Math helper
	clamp: function( value, min, max )
	{
		return Math.max( min, Math.min( value, max ) );
	},

	round: function( value, offset = 1 )
	{
		if( value % offset === 0 )
		{
			return value;
		}

		let splitFactor =  1 / offset;

		return Math.round( value * splitFactor ) / splitFactor;
	},

	ceil: function( value, offset = 1 )
	{
		if( value % offset === 0 )
		{
			return value;
		}

		let splitFactor =  1 / offset;

		return Math.ceil( value * splitFactor ) / splitFactor;
	}
};

module.exports = APIHolder;
