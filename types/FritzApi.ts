import { LoadNetwork, LoadOverview } from '../lib/FritzboxApiExtend';
import { Template } from "./Template";
import { xml2json } from "./xmlParserHelper";
import { GetDeviceListInfo } from "./FritzboxApiTypes";

const fritzapi = require( 'fritzapi/index' );

// override broken methods
fritzapi.getDeviceList = function( sid: any, options: any )
{
	return fritzapi.getDeviceListInfos( sid, options ).then( function( devicelistinfo: string )
	{
		// convert to object
		const parsedDeviceListInfo: GetDeviceListInfo = xml2json( devicelistinfo );

		// get device or devices
		const deviceData = parsedDeviceListInfo?.devicelist?.device;
		if( deviceData == undefined )
		{
			return [];
		}

		// get device array
		let devices = Array.isArray( deviceData ) ? deviceData : [ deviceData ];

		// filter invalid entries
		devices = devices.filter( x => x.identifier != undefined );

		// clean identifier
		devices.map( x => x.identifier = x.identifier?.replaceAll( ' ', '' ) );

		return devices;
	} );
}

export enum FritzApiBitmask
{
	hanFun = 1,
	Light = 1 << 2,
	Alarm = 1 << 4,
	Button = 1 << 5,
	Thermostat = 1 << 6,
	EnergyMeter = 1 << 7,
	TemperatureSensor = 1 << 8,
	Outlet = 1 << 9,
	DECTRepeater = 1 << 10,
	Microphone = 1 << 11,
	Template = 1 << 12,
	HanFunUnit = 1 << 13,
	SwitchControl = 1 << 15,
	LevelControl = 1 << 16,
	ColorControl = 1 << 17,
	BlindControl = 1 << 18,
	HumiditySensor = 1 << 20,
	NoButtons = 1 << 21
}

export enum HanFunTypes
{
	SimpleButton = 273
}

export enum FritzApiColor
{
	Orange = 'orange',
	Yellow = 'yellow',
	Lime = 'lime',
	Green = 'green',
	Turquoise = 'turquoise',
	Cyan = 'cyan',
	Lightblue = 'lightblue',
	Blue = 'blue',
	Purple = 'purple',
	Magenta = 'magenta',
	Pink = 'pink',
	Red = 'red'
}

export enum FritzApiTemperature
{
	T2700 = 2700,
	T3000 = 3000,
	T3400 = 3400,
	T3800 = 3800,
	T4200 = 4200,
	T4700 = 4700,
	T5300 = 5300,
	T5900 = 5900,
	T6500 = 6500
}

export enum FritzApiBlind
{
	Open = 'open', Close = 'close', Stop = 'stop'
}

// noinspection JSUnusedGlobalSymbols
export class FritzApi
{
	public static readonly MAX_TEMP: number = fritzapi.MAX_TEMP;
	public static readonly MIN_TEMP: number = fritzapi.MIN_TEMP;

	private api: any;

	public constructor( username: string, password: string, url: string, ssl: boolean )
	{
		this.api = new fritzapi.Fritz( username, password, url );

		this.api.options = {
			url: url,
			strictSSL: ssl,
			timeout: 15000
		};
	}

	/**
	 * Round value to 0.5c accuracy<br>
	 * Special cases:
	 * <pre>
	 *     254: 'on'
	 *     253: 'off'
	 * </pre>
	 */
	public static Api2Temp( value: number ): string | number
	{
		return fritzapi.api2temp( value );
	}

	/**
	 * Camp value to MIN (8) and MAX (28) and round to 0.5c accuracy<br>
	 * Special cases:
	 * <pre>
	 *     'on' / true: 254
	 *     'off' / false: 253
	 * </pre>
	 */
	public static Temp2Api( state: string | boolean | number ): number
	{
		return fritzapi.temp2api( state );
	}

	public static GetSessionID( username: string, password: string, options: {} ): string
	{
		return fritzapi.getSessionID( username, password, options );
	}

	public static CheckSession( sid: string, options: {} )
	{
		return fritzapi.checkSession( sid, options );
	}

	/**
	 * apply template
	 * @param ain device id
	 * @return applied id if success
	 */
	public applyTemplate( ain: string ): Promise<string>
	{
		return this.api.applyTemplate( ain );
	}

	public async getTemplates(): Promise<Template[]>
	{
		const parsed = xml2json( await this.api.getTemplateListInfos() );

		// @ts-ignore
		return [].concat( ( parsed.templatelist || {} ).template || [] )
		// @ts-ignore
		         .filter( template => template.autocreate === '0' || ( template.autocreate === '1' && typeof template.sub_templates === 'object' ) );
	}

	/**
	 * get basic device info (XML)
	 */
	public getBasicDeviceStats(): string
	{
		return this.api.getBasicDeviceStats();
	}

	public async getFritzboxOverview(): Promise<object>
	{
		return this.api.call( LoadOverview );
	}

	public async getFritzboxNetwork(): Promise<string[]>
	{
		return this.api.call( LoadNetwork );
	}

	/**
	 * get device list (json)
	 */
	public async getDeviceList(): Promise<object[]>
	{
		return this.api.getDeviceList();
	}

	/**
	 * get device list by filter criteria
	 * @param filter functionbitmask
	 * @return devices (json)
	 */
	public async getDeviceListFiltered( filter: FritzApiBitmask ): Promise<string[]>
	{
		return this.api.getDeviceListFiltered( filter );
	}

	/**
	 * get single device
	 * @param ain device id
	 * @return device (json)
	 */
	public getDevice( ain: string ): Promise<string>
	{
		return this.api.getDevice( ain );
	}

	/**
	 * get temperature- both switches and thermostats are supported, but not powerline modules
	 * @param ain device id
	 */
	public getTemperature( ain: string ): Promise<number>
	{
		return this.api.getTemperature( ain );
	}

	/**
	 * get presence from deviceListInfo
	 * @param ain device id
	 */
	public async getPresence( ain: string ): Promise<boolean>
	{
		return Boolean( await this.api.getPresence( ain ) );
	}

	/**
	 * get switch list
	 * @return device ids
	 */
	public getSwitchList(): Promise<string[]>
	{
		return this.api.getSwitchList();
	}

	/**
	 * get switch state
	 * @param ain device id
	 */
	public async getSwitchState( ain: string ): Promise<boolean>
	{
		return Boolean( await this.api.getSwitchState( ain ) );
	}

	/**
	 * turn an outlet on
	 * @param ain device id
	 * @return 1
	 */
	public async setSwitchOn( ain: string ): Promise<number>
	{
		return Number( await this.api.setSwitchOn( ain ) );
	}

	/**
	 * turn an outlet off
	 * @param ain device id
	 * @return 0
	 */
	public async setSwitchOff( ain: string ): Promise<number>
	{
		return Number( await this.api.setSwitchOff( ain ) );
	}

	/**
	 * toggle an outlet
	 * @param ain device id
	 * @return state the outlet was set to ( 0 / 1 )
	 */
	public async setSwitchToggle( ain: string ): Promise<number>
	{
		return Number( await this.api.setSwitchToggle( ain ) );
	}

	/**
	 * get the total energy consumption
	 * @param ain device id
	 * @return value in Wh
	 */
	public getSwitchEnergy( ain: string ): Promise<number>
	{
		return this.api.getSwitchEnergy( ain );
	}

	/**
	 * get the current energy consumption of an outlet
	 * @param ain device id
	 * @return value in mW or null if unknown
	 */
	public getSwitchPower( ain: string ): Promise<number | null>
	{
		return this.api.getSwitchPower( ain );
	}

	/**
	 * get the outlet presence status
	 * @param ain device id
	 */
	public async getSwitchPresence( ain: string ): Promise<boolean>
	{
		return Boolean( await this.api.getSwitchPresence( ain ) );
	}

	/**
	 * get switch name
	 * @param ain device id
	 */
	public getSwitchName( ain: string ): Promise<string>
	{
		return this.api.getSwitchName( ain );
	}

	/**
	 * get the thermostat list
	 * @return devices (json)
	 */
	public getThermostatList(): Promise<string[]>
	{
		return this.api.getThermostatList();
	}

	/**
	 * set target temperature (Solltemperatur)
	 * @param ain device id
	 * @param temp see Temp2Api for valid values
	 * @return temp
	 * @see FritzApi.Temp2Api
	 */
	public setTempTarget( ain: string, temp: string | boolean | number ): Promise<number>
	{
		return this.api.setTempTarget( ain, temp );
	}

	/**
	 * get target temperature (Solltemperatur)
	 * @param ain device id
	 * @return see FritzApi.Api2Temp for values
	 * @see FritzApi.Api2Temp
	 */
	public getTempTarget( ain: string ): Promise<string | number>
	{
		return this.api.getTempTarget( ain );
	}

	/**
	 * get night temperature (Absenktemperatur)
	 * @param ain device id
	 * @return see FritzApi.Api2Temp for values
	 * @see FritzApi.Api2Temp
	 */
	public getTempNight( ain: string ): Promise<string | number>
	{
		return this.api.getTempNight( ain );
	}

	/**
	 * get comfort temperature (Komforttemperatur)
	 * @param ain device id
	 * @return see FritzApi.Api2Temp for values
	 * @see FritzApi.Api2Temp
	 */
	public getTempComfort( ain: string ): Promise<string | number>
	{
		return this.api.getTempComfort( ain );
	}

	/**
	 * activate boost with end time or deactivate boost
	 * @param ain device id
	 * @param seconds time from now in seconds, min 0 ( disabled ), max 86400 ( 24h )
	 * @return seconds
	 */
	public setHkrBoost( ain: string, seconds: number ): Promise<number>
	{
		return this.api.setHkrBoost( ain, seconds );
	}

	/* doesnt exist
	getDimmableBulbList()
	{
		return this.api.getDimmableBulbList();
	}*/

	/**
	 * activate window open  with end time or deactivate boost
	 * @param ain device id
	 * @param seconds time from now in seconds, min 0 ( disabled ), max 86400 ( 24h )
	 * @return seconds
	 */
	public setHkrWindowOpen( ain: string, seconds: number ): Promise<number>
	{
		return this.api.setHkrWindowOpen( ain, seconds );
	}

	/**
	 * ??? unknown
	 * @param ain device id
	 * @param offset
	 * @return offset
	 */
	public setHkrOffset( ain: string, offset: number ): Promise<number>
	{
		return this.api.setHkrOffset( ain, offset );
	}

	/**
	 * get bulb devices
	 * @return devices (json)
	 */
	public getBulbList(): Promise<string[]>
	{
		return this.api.getBulbList();
	}

	/**
	 * get bulb devices wich support colors
	 */
	public getColorBulbList(): Promise<string[]>
	{
		return this.api.getColorBulbList();
	}

	/**
	 * switch the device on, of or toggle
	 * @param ain device id
	 * @param state 0 / 1 / 2 or 'off' / 'on' / 'toggle'
	 * @return state
	 */
	public setSimpleOnOff( ain: string, state: number | string ): Promise<number | string>
	{
		return this.api.setSimpleOnOff( ain, state );
	}

	/* not active
	getColorDefaults( ain: string )
	{
		return this.api.getColorDefaults( ain );
	}*/

	/**
	 * Dim the device
	 * @param ain device id
	 * @param level absolute dim level ( 0 - 255 )
	 * @return level
	 */
	public setLevel( ain: string, level: number ): Promise<number>
	{
		return this.api.setLevel( ain, Math.max( 0, level ) );
	}

	/**
	 * Dim the device
	 * @param ain device id
	 * @param levelInPercent percent dim level ( 0 - 100 )
	 * @return levelInPercent
	 */
	public setLevelPercentage( ain: string, levelInPercent: number ): Promise<number>
	{
		return this.api.setLevelPercentage( ain, Math.max( 0, levelInPercent ) );
	}

	/**
	 * Set the color and saturation of a color bulb
	 * @param ain device id
	 * @param color target color
	 * @param saturation target saturation ( 0 - high, 1 - mid, 2 - low )
	 * @param duration change duration ( in 100ms, 0 = instant )
	 * @return color
	 */
	public setColor( ain: string, color: FritzApiColor, saturation: number, duration: number ): Promise<string>
	{
		return this.api.setColor( ain, color, Math.max( 0, saturation ), Math.max( 0, duration ) );
	}

	/**
	 * Set the color temperature of a bulb
	 * @param ain device id
	 * @param temperature target color temperature
	 * @param duration change duration ( in 100ms, 0 = instant )
	 * @return temperature
	 */
	public setColorTemperature( ain: string, temperature: FritzApiTemperature, duration: number ): Promise<number>
	{
		return this.api.setColorTemperature( ain, temperature, duration );
	}

	/**
	 * Send command to blind device
	 * @param ain device id
	 * @param blindState command
	 * @return blindState
	 */
	public setBlind( ain: string, blindState: FritzApiBlind ): Promise<string>
	{
		return this.api.setBlind( ain, blindState );
	}

	/**
	 * Get battery state of single device
	 * ( query whole device list )
	 * @param ain device id
	 * @return battery state
	 */
	public getBatteryCharge( ain: string ): Promise<boolean>
	{
		return this.api.getBatteryCharge( ain );
	}

	/**
	 * Get window open flag of thermostat
	 * ( query whole device list )
	 * @param ain
	 * @return window open state
	 */
	public getWindowOpen( ain: string ): Promise<boolean>
	{
		return this.api.getWindowOpen( ain );
	}

	/**
	 * Get guest wlan settings
	 */
	public getGuestWlan(): Promise<object>
	{
		return this.api.getGuestWlan();
	}

	/**
	 * Enable / Disable guest wlan
	 * @param enable guest wlan status
	 * @return guest wlan settings
	 */
	public setGuestWlan( enable: boolean ): Promise<object>
	{
		return this.api.setGuestWlan( enable );
	}

	/**
	 * Get phone list
	 * @return phone list html
	 */
	public getPhoneList(): Promise<string>
	{
		return this.api.getPhoneList();
	}
}
