import { BaseFeature } from './BaseFeature';
import { MaskCheck } from './Helper';
import { FritzApiBitmask } from '../types/FritzApi';
import { Temperature } from '../features/Temperature';
import { BaseDevice } from './BaseDevice';
import { Availability } from '../features/Availability';
import { Alarm } from '../features/Alarm';
import { EnergyMeter } from '../features/EnergyMeter';
import { Outlet } from '../features/Outlet';
import { Thermostat } from '../features/Thermostat';
import { Blind } from '../features/Blind';
import { LevelControl } from '../features/LevelControl';
import { ColorControl } from '../features/ColorControl';
import { Humidity } from '../features/Humidity';
import { Button } from '../features/Button';
import Homey from 'homey/lib/Homey';
import { SwitchControl } from '../features/SwitchControl';

export class FunctionFactory
{
	public static RegisterCards( homey: Homey )
	{
		Temperature.RegisterCards( homey );
		Alarm.RegisterCards( homey );
		EnergyMeter.RegisterCards( homey );
		Outlet.RegisterCards( homey );
		Thermostat.RegisterCards( homey );
		Blind.RegisterCards( homey );
		LevelControl.RegisterCards( homey );
		ColorControl.RegisterCards( homey );
		Humidity.RegisterCards( homey );
		Button.RegisterCards( homey );
	}

	public static Create( functionMask: number, device: BaseDevice ): Array<BaseFeature>
	{
		let functions: Array<BaseFeature> = [ new Availability( device ) ];

		if( MaskCheck( functionMask, FritzApiBitmask.TemperatureSensor ) )
		{
			functions.push( new Temperature( device ) );
		}
		if( MaskCheck( functionMask, FritzApiBitmask.Alarm ) && !MaskCheck( functionMask, FritzApiBitmask.BlindControl ) )
		{
			functions.push( new Alarm( device ) );
		}
		if( MaskCheck( functionMask, FritzApiBitmask.EnergyMeter ) )
		{
			functions.push( new EnergyMeter( device ) );
		}
		if( MaskCheck( functionMask, FritzApiBitmask.Outlet ) )
		{
			functions.push( new Outlet( device ) );
		}
		if( MaskCheck( functionMask, FritzApiBitmask.Thermostat ) )
		{
			functions.push( new Thermostat( device ) );
		}
		if( MaskCheck( functionMask, FritzApiBitmask.BlindControl ) )
		{
			functions.push( new Blind( device ) );
		}
		if( MaskCheck( functionMask, FritzApiBitmask.LevelControl ) )
		{
			functions.push( new LevelControl( device ) );
		}
		if( MaskCheck( functionMask, FritzApiBitmask.ColorControl ) )
		{
			functions.push( new ColorControl( device ) );
		}
		if( MaskCheck( functionMask, FritzApiBitmask.HumiditySensor ) )
		{
			functions.push( new Humidity( device ) );
		}
		if( MaskCheck( functionMask, FritzApiBitmask.Button ) )
		{
			const noButtonsFlag = MaskCheck( functionMask, FritzApiBitmask.NoButtons );
			functions.push( new Button( device, noButtonsFlag ) );
		}
		if( MaskCheck( functionMask, FritzApiBitmask.SwitchControl ) && !MaskCheck( functionMask, FritzApiBitmask.Outlet ) )
		{
			functions.push( new SwitchControl( device ) );
		}

		return functions;
	}
}
