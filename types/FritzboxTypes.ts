export enum FritzboxBitmask
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

export enum FritzboxColor
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

export enum FritzboxTemperature
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

export enum FritzboxBlind
{
	Open = 'open', Close = 'close', Stop = 'stop'
}

export interface FritzboxApiDevice
{
	identifier?: string;
	id: string;
	functionbitmask: string;
	fwversion: string;
	manufacturer: string;
	productname: string;
}

export interface FritzboxOverview
{
	data: {
		dect?: { led?: string };
		fritzos?: { nspver?: string; isUpdateAvail?: boolean; energy?: string | number };
		[key: string]: unknown;
	};
}

export interface FritzboxNetwork
{
	data: {
		active?: import( './FritzboxDevice' ).FritzboxDevice[];
		[key: string]: unknown;
	};
}

export class FritzboxError extends Error
{
	public constructor( message: string, public readonly code: string | number )
	{
		super( message );
		this.name = 'FritzboxError';
	}
}
