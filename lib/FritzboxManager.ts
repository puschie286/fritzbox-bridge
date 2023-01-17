import { FritzApi } from "../types/FritzApi";
import { Validate } from "./Helper";
import { Settings } from "./Settings";
import { BaseDriver } from "./BaseDriver";
import { BaseDevice } from "./BaseDevice";
import Homey from "homey/lib/Homey";
import {clearIntervalAsync, setIntervalAsync, SetIntervalAsyncTimer} from "set-interval-async";
import { Device } from "../drivers/fritzbox/device";

export class FritzboxManager
{
	private apiInstance?: FritzApi;
	private polling?: SetIntervalAsyncTimer<[]>;
	private pollRunning: boolean = false;
	private statusPolling?: SetIntervalAsyncTimer<[]>;
	private statusPollRunning: boolean = false;
	private homey: Homey;

	private static instance?: FritzboxManager;

	public constructor( homey: Homey )
	{
		if( FritzboxManager.instance !== undefined )
		{
			throw new Error( 'already initialized - use FritzboxManager.GetSingleton' );
		}

		this.homey = homey;
		FritzboxManager.instance = this;
	}

	public static GetSingleton(): FritzboxManager
	{
		if( this.instance === undefined )
		{
			throw new Error( 'not initialized' );
		}
		return this.instance;
	}

	/**
	 * get api instance (fritzapi)
	 *
	 * @return fritz
	 */
	public GetApi(): FritzApi
	{
		if( this.apiInstance === undefined )
		{
			throw new Error( 'no api instance' );
		}
		return this.apiInstance;
	}

	// TODO: validate url, add http/https to address
	/**
	 * create new api instance ( set new login credential & options )
	 *
	 * @param username  fritzbox login username     ( default: no username )
	 * @param password  fritzbox login password     ( no default )
	 * @param url       fritzbox ip address         ( default: http://fritz.box )
	 * @param ssl       enable/disable strict ssl   ( default: true )
	 */
	public async Connect( username: string, password: string, url: string, ssl: boolean )
	{
		await this.StopPolling();
		await this.StopStatusPolling();

		delete this.apiInstance;
		this.apiInstance = new FritzApi( username, password, url, ssl );
	}

	/**
	 * start polling with interval delay ( restart polling when active on call )
	 * min: 1000        ( 1 sec )
	 * max: 86400000    ( 1 day )
	 * @param interval  time delay between two polls in milliseconds ( default: 60000 )
	 */
	public async StartPolling( interval: number )
	{
		if( interval < Settings.POLL_MIN * 1000 || interval > Settings.POLL_MAX * 1000 )
		{
			this.homey.log( 'Invalid interval - cancel polling ( ' + interval + ' )' );
			return;
		}
		if( this.apiInstance === undefined )
		{
			this.homey.error( 'not connected to api' );
			return;
		}
		if( this.polling !== undefined )
		{
			await this.StopPolling();
		}

		this.homey.log( 'start polling with ' + (Math.round( (interval / 1000) * 100 ) / 100) + 's interval' );
		this.polling = setIntervalAsync( this.Poll.bind( this ), interval );

		// direct update
		await this.Poll();
	}

	/**
	 * start status polling with interval delay ( restart polling when active on call )
	 * min: 1000        ( 1 sec )
	 * max: 86400000    ( 1 day )
	 * @param interval  time delay between two polls in milliseconds ( default: 60000 )
	 */
	public async StartStatusPolling( interval: number )
	{
		if( interval < Settings.POLL_MIN * 1000 || interval > Settings.POLL_MAX * 1000 )
		{
			this.homey.log( 'Invalid interval - cancel status polling ( ' + interval + ' )' );
			return;
		}
		if( this.apiInstance === undefined )
		{
			this.homey.error( 'not connected to api' );
			return;
		}
		if( this.statusPolling !== undefined )
		{
			await this.StopStatusPolling();
		}

		this.homey.log( 'start status polling with ' + ( Math.round( ( interval / 1000 ) * 100 ) / 100 ) + 's interval' );
		this.statusPolling = setIntervalAsync( this.StatusPoll.bind( this ), interval );

		// direct update
		await this.StatusPoll();
	}

	/**
	 * stop active polling ( ignored when inactive on call )
	 */
	public async StopPolling()
	{
		if( this.polling === undefined )
		{
			return;
		}

		this.homey.log( 'stop polling' );
		await clearIntervalAsync( this.polling );
		this.polling = undefined;
		this.pollRunning = false;
	}

	/**
	 * stop active status polling ( ignored when inactive on call )
	 */
	public async StopStatusPolling()
	{
		if( this.statusPolling === undefined )
		{
			return;
		}

		this.homey.log('stop status polling');

		await clearIntervalAsync( this.statusPolling );
		this.statusPolling = undefined;
		this.statusPollRunning = false;
	}

	// TODO: specify deviceList type
	/**
	 * filter deviceList based on functionmask ( device functions )
	 *
	 * @param deviceList        list of all device objects
	 * @param functionMask      function bitmask number
	 * @return []               list of passed devices
	 */
	public FilterDevices( deviceList: any[], functionMask: number ): any[]
	{
		let PassedDevices: any[] = [];
		if( deviceList.length > 0 )
		{
			deviceList.forEach( function( device )
			{
				// check if device contain driver function
				if( (Number( device.functionbitmask ) & functionMask) !== functionMask ) return;

				PassedDevices.push( device );
			} );
		}
		return PassedDevices;
	}

	// TODO: specify deviceList type, specify identifier type
	/**
	 * filter deviceList based on identifier ( device unique )
	 *
	 * @param deviceList        list of all device objects
	 * @param identifier        device unique identifier
	 * @return null|{}          founded device or null
	 */
	public FilterDevice( deviceList: any[], identifier: any ): any[] | null
	{
		if( !Array.isArray( deviceList ) || deviceList.length === 0 ) return null;

		let Device = null;
		deviceList.some( function( device )
		{
			if( device.identifier !== identifier )
				return false;

			Device = device;
			return true;
		} );
		return Device;
	}

	private async ProcessPoll( data: any[] )
	{
		const drivers = Object.entries( this.homey.drivers.getDrivers() );

		for( const [ _, driver] of drivers )
		{
			const baseDriver = driver as BaseDriver;

			// skip fritzbox driver
			if( baseDriver.GetFunctionMask() === -1 ) continue;

			const devices = driver.getDevices();

			// skip if no devices
			if( devices.length === 0 ) continue;

			// filter specific driver
			let DriverDeviceList = this.FilterDevices( data, baseDriver.GetFunctionMask() );

			// update device
			for( const device of devices )
			{
				// @ts-ignore
				const baseDevice = device as BaseDevice;

				await baseDevice.Update( this.FilterDevice( DriverDeviceList, device.getData().id ) );
			}
		}
	}

	private async ProcessStatusPoll( overview: any[], network: any[] ): Promise<void>
	{
		// TODO: check for memory performance
		const devices = this.homey.drivers.getDriver( 'fritzbox' ).getDevices();
		for( const device of devices )
		{
			const fritzboxDevice = device as Device;

			await fritzboxDevice.Update( overview );
			await fritzboxDevice.UpdateDevices( network );
		}
	}

	/**
	 * poll data from fritzbox
	 */
	private async Poll(): Promise<void>
	{
		if( this.pollRunning )
		{
			console.debug('Skip poll - still waiting on last poll');
			return;
		}

		this.pollRunning = true;

		try
		{
			const devices = await this.GetApi().getDeviceList();
			await this.ProcessPoll( devices );
		}
		catch( error: any )
		{
			this.logPolError( error );
		}


		this.pollRunning = false;
	}

	private async StatusPoll()
	{
		if( this.statusPollRunning )
		{
			console.debug( 'Skip poll - still waiting on last status poll' );
			return;
		}

		this.statusPollRunning = true;

		try
		{
			const overview = await this.GetApi().getFritzboxOverview();
			const network = await this.GetApi().getFritzboxNetwork();
			await this.ProcessStatusPoll( overview, network );
		}
		catch( error: any )
		{
			this.logPolError( error );
		}

		this.statusPollRunning = false;
	}

	// helper
	private logPolError( error: any )
	{
		if( Validate( error ) && Validate( error.error ) && Validate( error.error.code ) )
		{
			let code = error.error.code;
			if( code === 'ENOTFOUND' || code === 'ETIMEDOUT' )
			{
				this.homey.log( 'poll timeout' );
				return;
			}
		}

		this.homey.error( 'poll failed' );
		this.homey.error( error );
	}
}
