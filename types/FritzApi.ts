const fritzapi = require( 'fritzapi/index' );

export enum FritzApiBitmask
{
	hanFun = fritzapi.FUNCTION_HANFUN,
	Light = fritzapi.FUNCTION_LIGHT,
	Alarm = fritzapi.FUNCTION_ALARM,
	Button = fritzapi.FUNCTION_BUTTON,
	Thermostat = fritzapi.FUNCTION_THERMOSTAT,
	EnergyMeter = fritzapi.FUNCTION_ENERGYMETER,
	TemperatureSensor = fritzapi.FUNCTION_TEMPERATURESENSOR,
	Outlet = fritzapi.FUNCTION_OUTLET,
	DECTRepeater = fritzapi.FUNCTION_DECTREPEATER,
	Microphone = fritzapi.FUNCTION_MICROFONE,
	Template = fritzapi.FUNCTION_TEMPLATE,
	HanFunUnit = fritzapi.FUNCTION_HANFUNUNIT,
	SwitchControl = fritzapi.FUNCTION_SWITCHCONTROL,
	LevelControl = fritzapi.FUNCTION_LEVELCONTROL,
	ColorControl = fritzapi.FUNCTION_LEVELCONTROL
}

export enum FritzApiColor
{
	Red = 'red',
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
	Pink = 'pink'
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
	Open = 'open',
	Close = 'close',
	Stop = 'stop'
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
			strictSSL: ssl
		};
	}

	/**
	 * get session id
	 */
	public getSID(): string
	{
		return this.api.getSID();
	}

	/**
	 * get OS version
	 */
	public getOSVersion(): string | null
	{
		return this.api.getOSVersion();
	}

	/**
	 * get detailed device information (XML)
	 */
	public getDeviceListInfos(): Promise<string>
	{
		return this.api.getDeviceListInfos();
	}

	/**
	 * get template information (XML)
	 */
	public getTemplateListInfos(): string
	{
		return this.api.getTemplateListInfos();
	}

	/**
	 * get template information (json)
	 */
	public getTemplateList(): string
	{
		return this.api.getTemplateList();
	}

	/**
	 * apply template
	 * @param ain device id
	 * @return applied id if success
	 */
	public applyTemplate( ain: string ): string
	{
		return this.api.applyTemplate( ain );
	}

	/**
	 * get basic device info (XML)
	 */
	public getBasicDeviceStats(): string
	{
		return this.api.getBasicDeviceStats();
	}

	public async getOverviewList(): Promise<string[]>
	{
		// TODO: implement
		return [];
	}

	/**
	 * get device list (json)
	 */
	public async getDeviceList(): Promise<string[]>
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
	public getDevice( ain: string ): string
	{
		return this.api.getDevice( ain );
	}

	/**
	 * get temperature- both switches and thermostats are supported, but not powerline modules
	 * @param ain device id
	 */
	public getTemperature( ain: string ): number
	{
		return this.api.getTemperature( ain );
	}

	/**
	 * get presence from deviceListInfo
	 * @param ain device id
	 */
	public getPresence( ain: string ): boolean
	{
		return Boolean( this.api.getPresence( ain ) );
	}

	/**
	 * get switch list
	 * @return device ids
	 */
	public getSwitchList(): string[]
	{
		return this.api.getSwitchList();
	}

	/**
	 * get switch state
	 * @param ain device id
	 */
	public getSwitchState( ain: string ): boolean
	{
		return Boolean( this.api.getSwitchState( ain ) );
	}

	/**
	 * turn an outlet on
	 * @param ain device id
	 * @return 1
	 */
	public setSwitchOn( ain: string ): number
	{
		return Number( this.api.setSwitchOn( ain ) );
	}

	/**
	 * turn an outlet off
	 * @param ain device id
	 * @return 0
	 */
	public setSwitchOff( ain: string ): number
	{
		return Number( this.api.setSwitchOff( ain ) );
	}

	/**
	 * toggle an outlet
	 * @param ain device id
	 * @return state the outlet was set to ( 0 / 1 )
	 */
	public setSwitchToggle( ain: string ): number
	{
		return Number( this.api.setSwitchToggle( ain ) );
	}

	/**
	 * get the total energy consumption
	 * @param ain device id
	 * @return value in Wh
	 */
	public getSwitchEnergy( ain: string ): number
	{
		return this.api.getSwitchEnergy( ain );
	}

	/**
	 * get the current energy consumption of an outlet
	 * @param ain device id
	 * @return value in mW or null if unknown
	 */
	public getSwitchPower( ain: string ): number | null
	{
		return this.api.getSwitchPower( ain );
	}

	/**
	 * get the outlet presence status
	 * @param ain device id
	 */
	public getSwitchPresence( ain: string ): boolean
	{
		return Boolean( this.api.getSwitchPresence( ain ) );
	}

	/**
	 * get switch name
	 * @param ain device id
	 */
	public getSwitchName( ain: string ): string
	{
		return this.api.getSwitchName( ain );
	}

	/**
	 * get the thermostat list
	 * @return devices (json)
	 */
	public getThermostatList(): string[]
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
	public setTempTarget( ain: string, temp: string | boolean | number ): number
	{
		return this.api.setTempTarget( ain, temp );
	}

	/**
	 * get target temperature (Solltemperatur)
	 * @param ain device id
	 * @return see FritzApi.Api2Temp for values
	 * @see FritzApi.Api2Temp
	 */
	public getTempTarget( ain: string ): string | number
	{
		return this.api.getTempTarget( ain );
	}

	/**
	 * get night temperature (Absenktemperatur)
	 * @param ain device id
	 * @return see FritzApi.Api2Temp for values
	 * @see FritzApi.Api2Temp
	 */
	public getTempNight( ain: string ): string | number
	{
		return this.api.getTempNight( ain );
	}

	/**
	 * get comfort temperature (Komforttemperatur)
	 * @param ain device id
	 * @return see FritzApi.Api2Temp for values
	 * @see FritzApi.Api2Temp
	 */
	public getTempComfort( ain: string ): string | number
	{
		return this.api.getTempComfort( ain );
	}

	/**
	 * activate boost with end time or deactivate boost
	 * @param ain device id
	 * @param seconds time from now in seconds, min 0 ( disabled ), max 86400 ( 24h )
	 * @return seconds
	 */
	public setHkrBoost( ain: string, seconds: number ): number
	{
		return this.api.setHkrBoost( ain, seconds );
	}

	/**
	 * activate window open  with end time or deactivate boost
	 * @param ain device id
	 * @param seconds time from now in seconds, min 0 ( disabled ), max 86400 ( 24h )
	 * @return seconds
	 */
	public setHkrWindowOpen( ain: string, seconds: number ): number
	{
		return this.api.setHkrWindowOpen( ain, seconds );
	}

	/**
	 * ??? unknown
	 * @param ain device id
	 * @param offset
	 * @return offset
	 */
	public setHkrOffset( ain: string, offset: number ): number
	{
		return this.api.setHkrOffset( ain, offset );
	}

	/**
	 * get bulb devices
	 * @return devices (json)
	 */
	public getBulbList(): string[]
	{
		return this.api.getBulbList();
	}

	/**
	 * get bulb devices wich support colors
	 */
	public getColorBulbList(): string[]
	{
		return this.api.getColorBulbList();
	}

	/* doesnt exist
	getDimmableBulbList()
	{
		return this.api.getDimmableBulbList();
	}*/

	/**
	 * switch the device on, of or toggle
	 * @param ain device id
	 * @param state 0 / 1 / 2 or 'off' / 'on' / 'toggle'
	 * @return state
	 */
	public setSimpleOnOff( ain: string, state: number | string ): number | string
	{
		return this.api.setSimpleOnOff( ain, state );
	}

	/**
	 * Dim the device
	 * @param ain device id
	 * @param level absolute dim level ( 0 - 255 )
	 * @return level
	 */
	public setLevel( ain: string, level: number ): number
	{
		return this.api.setLevel( ain, Math.max( 0, level ) );
	}

	/**
	 * Dim the device
	 * @param ain device id
	 * @param levelInPercent percent dim level ( 0 - 100 )
	 * @return levelInPercent
	 */
	public setLevelPercentage( ain: string, levelInPercent: number ): number
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
	public setColor( ain: string, color: FritzApiColor, saturation: number, duration: number ): string
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
	public setColorTemperature( ain: string, temperature: FritzApiTemperature, duration: number ): number
	{
		return this.api.setColorTemperature( ain, temperature, duration );
	}

	/* not active
	getColorDefaults( ain: string )
	{
		return this.api.getColorDefaults( ain );
	}*/

	/**
	 * Send command to blind device
	 * @param ain device id
	 * @param blindState command
	 * @return blindState
	 */
	public setBlind( ain: string, blindState: FritzApiBlind ): string
	{
		return this.api.setBlind( ain, blindState );
	}

	/**
	 * Get battery state of single device
	 * ( query whole device list )
	 * @param ain device id
	 * @return battery state
	 */
	public getBatteryCharge( ain: string ): boolean
	{
		return this.api.getBatteryCharge( ain );
	}

	/**
	 * Get window open flag of thermostat
	 * ( query whole device list )
	 * @param ain
	 * @return window open state
	 */
	public getWindowOpen( ain: string ): boolean
	{
		return this.api.getWindowOpen( ain );
	}

	/**
	 * Get guest wlan settings
	 */
	public getGuestWlan(): object
	{
		return this.api.getGuestWlan();
	}

	/**
	 * Enable / Disable guest wlan
	 * @param enable guest wlan status
	 * @return guest wlan settings
	 */
	public setGuestWlan( enable: boolean ): object
	{
		return this.api.setGuestWlan( enable );
	}

	/**
	 * Get phone list
	 * @return phone list html
	 */
	public getPhoneList(): string
	{
		return this.api.getPhoneList();
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
}
