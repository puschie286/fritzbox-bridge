import { FritzApi } from '../types/FritzApi';
import { HandleHttpError, MaskCheck } from './Helper';
import { Settings, SettingsDefault } from './Settings';
import { BaseDriver } from './BaseDriver';
import { BaseDevice } from './BaseDevice';
import Homey from 'homey/lib/Homey';
import { Device } from '../drivers/fritzbox/device';
import { FritzboxTracker } from './FritzboxTracker';

export class FritzboxManager
{
	private static instance?: FritzboxManager;
	private apiInstance?: FritzApi;
	private polling?: NodeJS.Timeout;
	private lastPolling?: number;
	private lastLongPolling?: number;
	private readonly homey: Homey;
	private readonly tracker: FritzboxTracker;
	private lastDeviceData?: any;
	private readonly pollingWaitTime: number = 45 * 1000; // set to >30 to ensure we don't spam fritzbox (might have negative effects on older versions)
	private readonly longPollingWaitTime: number = 10 * 60 * 1000; // long polls are fixed to update every 10 min

	public constructor( homey: Homey )
	{
		if( FritzboxManager.instance !== undefined )
		{
			throw new Error( 'already initialized - use FritzboxManager.GetSingleton' );
		}

		this.homey = homey;
		this.tracker = new FritzboxTracker( homey );

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

	/*public async LogMessageOnline( message: string ): Promise<boolean>
	{
		const maxLength = 8000;
		let sendingMessage = message;

		while( sendingMessage.length > 0 )
		{
			const messagePart = sendingMessage.substr( 0, maxLength );
			sendingMessage = sendingMessage.substr( maxLength );

			if( await this.log.captureMessage( messagePart ) === undefined )
			{
				return false;
			}
		}

		return true;
	}*/

	public GetLastData(): any
	{
		return this.lastDeviceData;
	}
	
	/**
	 * create new api instance ( set new login credential & options )
	 *
	 * @param username  fritzbox login username     ( default: no username )
	 * @param password  fritzbox login password     ( no default )
	 * @param url       fritzbox ip address         ( default: http://fritz.box )
	 * @param ssl       enable/disable strict ssl   ( default: true )
	 */
	public Connect( username: string, password: string, url: string, ssl: boolean )
	{
		this.StopPolling();

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
			this.StopPolling();
		}

		this.homey.log( 'start polling with ' + ( Math.round( ( interval / 1000 ) * 100 ) / 100 ) + 's interval' );
		this.homey.log( 'polling config, smart home: ' + this.isPollingSmartHomeEnabled() + ', network: ' + this.isPollingNetworkEnabled() );
		this.polling = this.homey.setInterval( this.Poll.bind( this ), interval );

		// direct update
		await this.Poll();
	}

	/**
	 * stop active polling ( ignored when inactive on call )
	 */
	public StopPolling()
	{
		if( this.polling === undefined )
		{
			return;
		}

		this.homey.log( 'stop polling' );
		this.homey.clearInterval( this.polling );
		this.polling = undefined;
		this.lastPolling = undefined;
	}

	// TODO: specify deviceList type
	/**
	 * filter deviceList based on functionmask ( device features )
	 *
	 * @param deviceList        list of all device objects
	 * @param functionMask      function bitmask number
	 * @return []               list of passed devices
	 */
	public FilterDevices( deviceList: any[], functionMask: number ): any[]
	{
		let validDevices: any[] = [];
		for( const device of deviceList )
		{
			if( !MaskCheck( device.functionbitmask, functionMask ) ) continue;
			validDevices.push( device );
		}
		return validDevices;
	}

	// TODO: specify deviceList type, specify identifier type
	/**
	 * filter deviceList based on identifier ( device unique )
	 *
	 * @param deviceList        list of all device objects
	 * @param identifier        device unique identifier
	 * @return null|{}          founded device or null
	 */
	public FilterDevice( deviceList: any[], identifier: any ): object | null
	{
		if( !Array.isArray( deviceList ) || deviceList.length === 0 ) return null;

		for( const device of deviceList )
		{
			if( device.identifier !== identifier ) continue;

			return device;
		}

		return null;
	}

	private isPollingSmartHomeEnabled(): boolean
	{
		if( this.homey.settings.get( Settings.DECT_SUPPORT ) !== true )
		{
			return false;
		}

		return ( this.homey.settings.get( Settings.REQUEST_SMART_HOME ) || SettingsDefault.REQUEST_SMART_HOME ) == true;
	}

	private isPollingNetworkEnabled(): boolean
	{
		return ( this.homey.settings.get( Settings.REQUEST_NETWORK ) || SettingsDefault.REQUEST_NETWORK ) == true;
	}

	private async ProcessPoll( data: any[] )
	{
		const drivers = Object.entries( this.homey.drivers.getDrivers() );

		for( const [ _, driver ] of drivers )
		{
			const baseDriver = driver as BaseDriver;

			// skip fritzbox driver
			if( baseDriver.GetBaseFunction() === -1 ) continue;

			const devices = driver.getDevices();

			// skip if no devices
			if( devices.length === 0 ) continue;

			// filter specific driver
			let DriverDeviceList = this.FilterDevices( data, baseDriver.GetBaseFunction() );

			// update device
			for( const device of devices )
			{
				// @ts-ignore
				const baseDevice = device as BaseDevice;

				await baseDevice.Update( this.FilterDevice( DriverDeviceList, device.getData().id ) );
			}
		}
	}

	private async ExecuteSmartHomePoll()
	{
		if( !this.isPollingSmartHomeEnabled() )
		{
			return;
		}

		this.lastDeviceData = await this.GetApi().getDeviceList();
		await this.ProcessPoll( this.lastDeviceData );
	}

	private async ExecuteNetworkPoll()
	{
		if( !this.isPollingNetworkEnabled() )
		{
			return;
		}

		const network = await this.GetApi().getFritzboxNetwork();
		await this.tracker.UpdateDevices( network );
	}

	private async ExecuteStatusPoll()
	{
		const fritzbox = this.homey.drivers.getDriver( 'fritzbox' ).getDevices();
		if( fritzbox.length > 0 )
		{
			return;
		}

		const currentTime = new Date().getTime();
		if( this.lastLongPolling && this.lastLongPolling + this.longPollingWaitTime > currentTime )
		{
			return;
		}

		// update devices
		const overview = await this.GetApi().getFritzboxOverview();
		await this.updateFritzboxData( overview, );
	}

	public async updateFritzboxData( overview: object )
	{
		this.lastLongPolling = new Date().getTime();
		for( const device of this.homey.drivers.getDriver( 'fritzbox' ).getDevices() )
		{
			const fritzboxDevice = device as Device;

			await fritzboxDevice.Update( overview );
		}

		console.log( 'fritzbox data updated' );
	}

	/**
	 * poll data from fritzbox
	 */
	private async Poll(): Promise<void>
	{
		const currentTime = new Date().getTime();
		if( this.lastPolling && this.lastPolling + this.pollingWaitTime > currentTime )
		{
			console.debug( 'skip poll' );
			return;
		}
		
		this.lastPolling = currentTime;
		
		try
		{
			await this.ExecuteSmartHomePoll();
			await this.ExecuteNetworkPoll();
			await this.ExecuteStatusPoll();
		} catch( error: any )
		{
			this.logPolError( error );
		}
		
		// clear waiting on last
		this.lastPolling = undefined;
	}

	// helper
	private logPolError( error: any )
	{
		const result = HandleHttpError( error );
		if( result === 'timeout' )
		{
			this.homey.log( 'poll timeout' );
			return;
		}
		
		this.homey.error( 'poll failed' );
		this.homey.error( result );
	}
}
