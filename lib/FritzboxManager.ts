import { FritzboxClient } from './FritzboxClient';
import { HandleHttpError, IsRetryableHttpError, MaskCheck } from './Helper';
import { Settings, SettingsDefault } from './Settings';
import { BaseDriver } from './BaseDriver';
import { BaseDevice } from './BaseDevice';
import Homey from 'homey/lib/Homey';
import { Device } from '../drivers/fritzbox/device';
import { FritzboxTracker } from './FritzboxTracker';

export class FritzboxManager
{
	private static instance?: FritzboxManager;
	private apiInstance?: FritzboxClient;
	private polling?: NodeJS.Timeout;
	private pollingGeneration = 0;
	private connectionUpdate: Promise<void> = Promise.resolve();
	private lastPolling?: number;
	private lastLongPolling?: number;
	private readonly homey: Homey;
	private readonly tracker: FritzboxTracker;
	private lastDeviceData?: any;
	private readonly pollingWaitTime: number = 4 * 60 * 1000; // ensure we don't spam fritzbox (might have negative effects on older versions)
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
	 * get FRITZ!Box client instance
	 *
	 * @return client
	 */
	public GetApi(): FritzboxClient
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

		this.lastDeviceData = undefined;
		this.lastLongPolling = undefined;
		this.connectionUpdate = Promise.all( [ this.connectionUpdate,
			this.SetDevicesUnavailable( 'Message.WaitingForData' ) ] ).then( () => {} );
		delete this.apiInstance;
		this.apiInstance = new FritzboxClient( username, password, url, ssl );
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
		this.pollingGeneration++;
		this.lastPolling = undefined;
		if( this.polling === undefined )
		{
			return;
		}

		this.homey.log( 'stop polling' );
		this.homey.clearInterval( this.polling );
		this.polling = undefined;
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
		if( this.homey.settings.get( Settings.DECT_SUPPORT ) === false )
		{
			return false;
		}

		return ( this.homey.settings.get( Settings.REQUEST_SMART_HOME ) ?? SettingsDefault.REQUEST_SMART_HOME ) === true;
	}

	private isPollingNetworkEnabled(): boolean
	{
		return ( this.homey.settings.get( Settings.REQUEST_NETWORK ) ?? SettingsDefault.REQUEST_NETWORK ) === true;
	}

	private shouldUpdateStatus(): boolean
	{
		// first call or wait time reached
		return this.lastLongPolling === undefined || this.lastLongPolling + this.longPollingWaitTime < this.getCurrentTime();
	}

	private markStatusAsUpdated()
	{
		this.lastLongPolling = this.getCurrentTime();
	}

	private shouldPoll(): boolean
	{
		// first call or wait time not reached
		return this.lastPolling == undefined || this.lastPolling + this.pollingWaitTime < this.getCurrentTime();
	}

	private markPollAsActive()
	{
		this.lastPolling = this.getCurrentTime();
	}

	private markPollAsDone()
	{
		this.lastPolling = undefined;
	}

	private getCurrentTime(): number
	{
		return new Date().getTime();
	}

	private async ProcessPoll( data: any[], generation: number )
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
				if( generation !== this.pollingGeneration ) return;
				// @ts-ignore
				const baseDevice = device as BaseDevice;

				await this.UpdateDevice( baseDevice, this.FilterDevice( DriverDeviceList, device.getData().id ), generation );
			}
		}
	}

	private async ExecuteSmartHomePoll( generation: number )
	{
		if( !this.isPollingSmartHomeEnabled() )
		{
			return;
		}

		const data = await this.GetApi().getDeviceList();
		if( generation !== this.pollingGeneration ) return;
		this.lastDeviceData = data;
		await this.ProcessPoll( data, generation );
	}

	private async ExecuteNetworkPoll( generation: number )
	{
		if( !this.isPollingNetworkEnabled() )
		{
			return;
		}

		const network = await this.GetApi().getFritzboxNetwork();
		if( generation !== this.pollingGeneration ) return;
		await this.tracker.UpdateDevices( network );
	}

	private async ExecuteStatusPoll( generation: number )
	{
		const fritzbox = this.homey.drivers.getDriver( 'fritzbox' ).getDevices();
		if( fritzbox.length === 0 )
		{
			return;
		}

		if( !this.shouldUpdateStatus() && fritzbox.every( device => device.getAvailable() ) )
		{
			return;
		}

		// update devices
		const overview = await this.GetApi().getFritzboxOverview();
		if( generation !== this.pollingGeneration ) return;
		await this.updateFritzboxData( overview );

		// mark as done
		if( generation === this.pollingGeneration ) this.markStatusAsUpdated();
	}

	public async updateFritzboxData( overview: object )
	{
		const generation = this.pollingGeneration;
		await this.connectionUpdate;
		for( const device of this.homey.drivers.getDriver( 'fritzbox' ).getDevices() )
		{
			if( generation !== this.pollingGeneration ) return;
			const fritzboxDevice = device as Device;

			await this.UpdateDevice( fritzboxDevice, overview, generation );
		}
	}

	private async UpdateDevice( device: BaseDevice, data: any, generation: number ): Promise<void>
	{
		const isCurrent = () => generation === this.pollingGeneration;
		if( !isCurrent() ) return;
		try
		{
			await device.Update( data, isCurrent );
		}
		catch( error: any )
		{
			if( !isCurrent() ) return;
			const message = HandleHttpError( error ) || 'Message.SendFailed';
			this.homey.error( 'device update failed', message );
			await device.setUnavailable( this.homey.__( message ) ).catch( failure => this.homey.error( failure ) );
		}
	}

	private async SetDevicesUnavailable( message: string, router?: boolean ): Promise<void>
	{
		const updates: Array<Promise<void>> = [];
		for( const driver of Object.values( this.homey.drivers.getDrivers() ) )
		{
			const isRouter = ( driver as BaseDriver ).GetBaseFunction() === -1;
			if( router !== undefined && router !== isRouter ) continue;
			for( const device of driver.getDevices() )
			{
				updates.push( device.setUnavailable( this.homey.__( message ) ).catch( error => this.homey.error( error ) ) );
			}
		}
		await Promise.all( updates );
	}

	private async RunPoll( poll: () => Promise<void>, generation: number, router?: boolean ): Promise<void>
	{
		if( generation !== this.pollingGeneration ) return;
		try
		{
			await poll();
		}
		catch( error: any )
		{
			if( generation !== this.pollingGeneration ) return;
			this.logPolError( error );
			const message = HandleHttpError( error ) || 'Message.SendFailed';
			// Confirm router connectivity immediately after transport or authentication failures.
			if( IsRetryableHttpError( error ) || message === 'Message.InvalidLogin' || message === 'Message.InvalidSSL' )
			{
				this.lastLongPolling = undefined;
			}
			// Network tracking is optional and does not determine device availability.
			if( router === undefined ) return;
			if( router ) this.lastLongPolling = undefined;
			else this.lastDeviceData = undefined;
			await this.SetDevicesUnavailable( message, router );
		}
	}

	/**
	 * poll data from fritzbox
	 */
	private async Poll(): Promise<void>
	{
		if( !this.shouldPoll() )
		{
			console.debug( 'skip poll' );
			return;
		}

		const generation = this.pollingGeneration;
		this.markPollAsActive();
		
		try
		{
			await this.connectionUpdate;
			await this.RunPoll( () => this.ExecuteSmartHomePoll( generation ), generation, false );
			await this.RunPoll( () => this.ExecuteNetworkPoll( generation ), generation );
			await this.RunPoll( () => this.ExecuteStatusPoll( generation ), generation, true );
		}
		finally
		{
			if( generation === this.pollingGeneration ) this.markPollAsDone();
		}
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
