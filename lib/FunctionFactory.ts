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

export class FunctionFactory
{
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

		return functions;
	}
}
