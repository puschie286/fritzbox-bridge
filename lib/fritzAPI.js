'use strict';

const fritzAPI = require('fritzapi').Fritz;
const Homey = require('homey');
const LOG = require('./logWrapper' );

let APIHolder =
{
	CONST_ALARM:            1 << 4, // Alarm Sensor
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
	 */
	StartPolling: function( interval )
	{
		let Value = Number.parseInt( interval );
		if( Value < 1000 || Value > 86400000 )
		{
			LOG.warning( 'Invalid interval - cancel polling ( ' + interval + ' => ' + Value + ' )' );
			return;
		}

		if( this.pollingID !== null )
		{
			this.StopPolling();
		}

		LOG.info( 'start polling with ' + Value + ' interval' );
		this.pollingID = setInterval( this.Poll.bind( this ), Value );
		this.Poll( true );
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
			LOG.warning( 'Invalid interval - cancel status polling ( ' + interval + ' => ' + Value + ' )' );
			return;
		}

		if( this.statusPollingID !== null )
		{
			this.StopStatusPolling();
		}

		LOG.info( 'start status polling with ' + Value + ' interval' );
		this.statusPollingID = setInterval( this.StatusPoll.bind( this ), Value );
		this.StatusPoll( true );
	},

	/**
	 * check if polling is active
	 * @return boolean
	 */
	IsPollingActive: function()
	{
		return this.pollingID !== null;
	},

	/**
	 * check if status polling is active
	 * @return boolean
	 */
	IsStatusPollingActive: function()
	{
		return this.statusPollingID !== null;
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

		LOG.info( 'stop polling' );
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

	/**
	 * copy propertyList from device to new object ( return )
	 *
	 * @param device            device data
	 * @param propertyList      list of properties to copy
	 * @return object|null
	 */
	CopyProperties: function( device, propertyList )
	{
		// validate
		if( typeof device !== 'object' || !Array.isArray( propertyList ) )
			return {};

		return this.LoopCopy( device, propertyList );
	},

	CompareProperties: function( oldArray, newArray )
	{
		// validate
		if( typeof oldArray !== 'object' )
		{
			if( typeof newArray === 'object' )
				return newArray;

			return [];
		}
		else if( typeof newArray !== 'object' )
		{
			LOG.debug( 'invalid newArray: ' + JSON.stringify( newArray ) );
			newArray = {};
		}

		let Target = [];
		Object.assign( [], Object.keys( oldArray ), Object.keys( newArray ) ).forEach( function( key )
		{
			let OldValue = oldArray[key];
			let NewValue = newArray[key];

			if( OldValue === NewValue ) return;

			Target[key] = NewValue;
		});

		return Target;
	},

	LoopCopy: function( object, list, outerKey )
	{
		let Target = {};

		Object.keys( object ).forEach( function( key )
		{
			let FullKey = outerKey !== undefined ? outerKey + '.' + key : key.toString();
			let Value = object[key];

			if( typeof Value === 'object' )
			{
				Object.assign( Target, this.LoopCopy( Value, list, FullKey ) );
				return;
			}

			if( !list.includes( FullKey ) ) return;

			Target[FullKey] = Value;
		}.bind( this ) );

		return Target;
	},

	/**
	 * poll data from fritzbox
	 */
	Poll: function( first )
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

			if( first === true )
			{
				LOG.debug( 'full device list' );
				LOG.debug( JSON.stringify( deviceList ) );
			}

			let ObjectContainer = Homey.ManagerDrivers.getDrivers();
			for( let Driver in ObjectContainer )
			{
				let DriverInstance = ObjectContainer[Driver];

				// skip fritzbox
				if( DriverInstance.GetName() === 'Fritzbox' ) continue;

				// filter specific driver
				let DriverDeviceList = this.FilterDevices( deviceList, DriverInstance.GetFunctionmask()  );

				// update device
				DriverInstance.getDevices().forEach( function( device )
				{
					let DeviceData = this.FilterDevice( DriverDeviceList, device.getData().id );
					if( DeviceData === null )
					{
						LOG.debug( 'device data not found: ' + device.GetName() );
						return;
					}
					device.onUpdate( this.CopyProperties( DeviceData, DriverInstance.GetFilterList() ) );
				}.bind( this ) );
			}
		}.bind( this ) ).catch( function( error )
		{
			this.pollActive = false;
			LOG.info( 'failed to getDeviceList: ' + error );
		}.bind( this ) );
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

			let Driver = Homey.ManagerDrivers.getDriver( 'fritzbox' );
			let Data = this.CopyProperties( data, Driver.GetFilterList() );
			Driver.getDevices().forEach( function( device )
			{
				device.onUpdate( Data );
			} );
		}.bind( this ) ).catch( function( error )
		{
			this.statusPollActive = false;
			LOG.info( 'failed to getOverviewData: ' + error );
		}.bind( this ) );
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
	}
};

module.exports = APIHolder;