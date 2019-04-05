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
	pollData: null,

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
		if( !Number.isInteger( Value ) || Value < 1000 || Value > 86400000 )
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
	 * check if polling is active
	 * @return boolean
	 */
	IsPollingActive: function()
	{
		return this.pollingID !== null;
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
	},

	/**
	 * filter deviceList based on functionmask ( device functions )
	 *
	 * @param deviceList        list of all device objects
	 * @param functionmask      function bitmask number
	 * @return [[],[]]          [ list of passed devices, list of failed devices ]
	 */
	FilterDevices: function( deviceList, functionmask )
	{
		if( typeof functionmask !== "number" )
		{
			LOG.error( 'ERROR - functionmask invalid ', functionmask );
			return [ [], [] ];
		}

		let PassedDevices = [];
		let FailedDevices = [];
		if( deviceList.length > 0 )
		{
			deviceList.forEach( function( device )
			{
				// check if device contain driver function
				if( ( Number( device.functionbitmask ) & functionmask ) === functionmask )
				{
					PassedDevices.push( device );
				}
				else
				{
					FailedDevices.push( device );
				}
			});
		}
		return [ PassedDevices, FailedDevices ];
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
	 * filter new & old data on changes and propertyList
	 *
	 * @param newDevice         new device data
	 * @param oldDevice         old device data
	 * @param propertyList      list of valid properties        ( default: all )
	 * @param outerKey          key parent for recursive calls
	 * @return []               list of changed properties
	 */
	FilterProperty: function( newDevice, oldDevice, propertyList = null, outerKey = null )
	{
		let ChangedProperties = [];

		// validate input
		if( newDevice === null && oldDevice === null && propertyList === null )
			return ChangedProperties;

		let PropertyList = propertyList || ( newDevice !== null ? Object.keys( newDevice ) : Object.keys( oldDevice ) );
		let PropertyLiveList = propertyList;

		PropertyList.forEach( function( key )
		{
			// skip multi level keys
			if( key.includes( '.' ) ) return;

			let OldValue = oldDevice.hasOwnProperty( key ) ? oldDevice[key] : null;
			let NewValue = newDevice.hasOwnProperty( key ) ? newDevice[key] : null;

			// delete from copy
			if( PropertyLiveList !== null && PropertyLiveList.length > 0 )
			{
				delete PropertyLiveList[PropertyLiveList.indexOf(key)];
			}

			// check for array/object
			let FullKey = outerKey === null ? key : outerKey + '.' + key;
			if( Array.isArray( NewValue ) || typeof NewValue === 'object' ||
				Array.isArray( OldValue ) || typeof OldValue === 'object' )
			{
				ChangedProperties = Object.assign( [], ChangedProperties, this.FilterProperty( NewValue, OldValue, PropertyLiveList, FullKey ) );
				return;
			}

			//  check for change
			if( OldValue === NewValue ) return;

			// store change
			ChangedProperties[FullKey] = NewValue;
		}.bind( this ) );

		return ChangedProperties;
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
			this.pollData = deviceList;

			if( first === true )
			{
				LOG.debug( 'full device list' );
				LOG.debug( JSON.stringify( deviceList ) );
			}

			let ObjectContainer = Homey.ManagerDrivers.getDrivers();
			for( let Driver in ObjectContainer )
			{
				let DriverInstance = ObjectContainer[Driver];

				let DeviceList = this.FilterDevices( deviceList, DriverInstance.Functionmask );

				// update driver
				//DriverInstance.Update( DeviceList[0], DeviceList[1] );

				// update device
				DriverInstance.getDevices().forEach(function( device )
				{
					device.onUpdate( this.FilterDevice( DeviceList[0], device.getData().id ), DeviceList[0], DeviceList[1] );
				}.bind( this ) );
			}
		}.bind( this ) ).catch( function( error )
		{
			this.pollActive = false;
			LOG.info( 'failed to getDeviceList: ' + error );
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