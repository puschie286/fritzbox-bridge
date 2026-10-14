import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';
import { CapabilityListener } from '../types/CapabilityListener';
import { FritzboxColor, FritzboxTemperature } from '../types/FritzboxTypes';
import { Closest } from '../lib/Helper';
import { FRITZBOX_COLORS } from '../lib/FritzboxColors';

interface ColorWrite
{
	hue?: number;
	saturation?: number;
	task: Promise<void>;
}

export class ColorControl extends BaseFeature
{
	private readonly minTemperature: number = 2700;
	private readonly maxTemperature: number = 6500;
	private readonly temperatureValues: Array<number> = [ 2700, 3000, 3400, 3800, 4200, 4700, 5300, 5900, 6500 ];
	private readonly maxHue: number = 360;
	private readonly hueValues: Array<number> = Object.values( FRITZBOX_COLORS ).map( color => color.hue );
	private readonly highSaturation: number = 1;
	private readonly midSaturation: number = 0.5;
	private readonly lowSaturation: number = 0;

	private lastHue: number | null = null;
	private pendingColor?: ColorWrite;
	private colorTask: Promise<void> = Promise.resolve();

	private static ConvertColorMode( value: number | null ): string | null
	{
		if( value === 1 )
		{
			return 'color';
		}
		if( value === 4 )
		{
			return 'temperature';
		}

		return null;
	}

	private static ConvertColorHue( value: number | null ): FritzboxColor
	{
		const color = Object.entries( FRITZBOX_COLORS ).find( ( [ _, entry ] ) => entry.hue === value );
		return color === undefined ? FritzboxColor.Red : color[0] as FritzboxColor;
	}

	protected Capabilities(): Array<Capability>
	{
		return [ {
			name: 'light_mode',
			state: 'colorcontrol.current_mode',
			type: CapabilityType.Integer,
			valueFunc: ColorControl.ConvertColorMode
		}, {
			name: 'light_temperature',
			state: 'colorcontrol.temperature',
			type: CapabilityType.Number,
			valueFunc: this.MapFritzboxTemperature.bind( this )
		}, {
			name: 'light_hue',
			state: 'colorcontrol.hue',
			type: CapabilityType.Integer,
			valueFunc: this.MapFritzboxHue.bind( this )
		}, {
			name: 'light_saturation',
			state: 'colorcontrol.saturation',
			type: CapabilityType.Number,
			valueFunc: this.MapFritzboxSaturation.bind( this )
		} ];
	}

	public override Listeners(): Array<CapabilityListener>
	{
		return [ {
			name: 'light_hue', callback: this.setHue
		}, {
			name: 'light_saturation', callback: this.setSaturation
		}, {
			name: 'light_mode', callback: this.setMode
		}, {
			name: 'light_temperature', callback: this.setTemperature
		} ];
	}

	private static ConvertTemperatureToEnum( value: number ): FritzboxTemperature
	{
		switch( value )
		{
			case 2700:
				return FritzboxTemperature.T2700;
			case 3000:
				return FritzboxTemperature.T3000;
			case 3400:
				return FritzboxTemperature.T3400;
			case 3800:
				return FritzboxTemperature.T3800;
			case 4200:
				return FritzboxTemperature.T4200;
			case 4700:
				return FritzboxTemperature.T4700;
			case 5300:
				return FritzboxTemperature.T5300;
			case 5900:
				return FritzboxTemperature.T5900;
			case 6500:
				return FritzboxTemperature.T6500;
		}

		return FritzboxTemperature.T2700;
	}

	private ConvertSaturationToEnum( hue: FritzboxColor, value: number ): number
	{
		const index = [ this.highSaturation, this.midSaturation, this.lowSaturation ].indexOf( value );
		if( index !== -1 )
		{
			return FRITZBOX_COLORS[hue].saturations[index];
		}

		this.device.log( 'unknown saturation(set): ' + value );
		return 0;
	}

	private MapFritzboxTemperature( value: number | null ): number | null
	{
		if( value === null )
		{
			return null;
		}

		const clampedValue = ( value - this.minTemperature ) / ( this.maxTemperature - this.minTemperature );
		this.device.log( 'temp: ' + value + ' -> ' + clampedValue );

		return clampedValue;
	}

	private MapFritzboxHue( value: number | null )
	{
		this.lastHue = value;
		if( value === null )
		{
			return null;
		}
		return value / this.maxHue;
	}

	private MapFritzboxSaturation( value: number | null ): number | null
	{
		if( this.lastHue === null || value === null )
		{
			return null;
		}

		const color = Object.values( FRITZBOX_COLORS ).find( entry => entry.hue === this.lastHue );
		const saturations: readonly number[] = color?.saturations ?? [];
		const index = saturations.indexOf( value );
		if( index !== -1 )
		{
			return [ this.highSaturation, this.midSaturation, this.lowSaturation ][index];
		}

		this.device.log( 'unknown saturation(read): hue ' + this.lastHue + ', sat ' + value );
		return null;
	}

	private setMode( value: any )
	{

	}

	private async setTemperature( value: any )
	{
		if( value === null || value === undefined )
		{
			return;
		}

		if( this.device.getCapabilityValue( 'light_mode' ) !== 'temperature' )
		{
			return;
		}

		const upScaled = ( value * ( this.maxTemperature - this.minTemperature ) ) + this.minTemperature;
		const validTemperature = Closest( upScaled, this.temperatureValues );
		const enumValue = ColorControl.ConvertTemperatureToEnum( validTemperature );

		this.device.log( 'send setColorTemperature: ' + validTemperature );
		await this.device.GetAPI().setColorTemperature( this.device.getData().id, enumValue, 500 );
	}

	private async setColor( hue: number, saturation: number )
	{
		// ignore when not color mode
		if( this.device.getCapabilityValue( 'light_mode' ) !== 'color' )
		{
			return;
		}

		const upScaledHue = hue * this.maxHue;
		const validHue = Closest( upScaledHue, this.hueValues );

		const validSaturation = Closest( saturation, [ this.lowSaturation, this.midSaturation, this.highSaturation ] );

		const apiHue = ColorControl.ConvertColorHue( validHue );
		const apiSaturation = this.ConvertSaturationToEnum( apiHue, validSaturation );

		this.device.log( 'send setColor: ' + apiSaturation + ', ' + apiHue );
		await this.device.GetAPI().setColor( this.device.getData().id, apiHue, apiSaturation, 500 );
		this.lastHue = validHue;
		await this.device.setCapabilityValue( 'light_hue', validHue / this.maxHue );
		await this.device.setCapabilityValue( 'light_saturation', validSaturation );
	}

	private queueColor( hue?: number, saturation?: number ): Promise<void>
	{
		if( this.pendingColor !== undefined )
		{
			if( hue !== undefined ) this.pendingColor.hue = hue;
			if( saturation !== undefined ) this.pendingColor.saturation = saturation;
			return this.pendingColor.task;
		}

		const pending: ColorWrite = {
			hue, saturation,
			task: this.colorTask.catch( () => undefined ).then( async() =>
			{
				this.pendingColor = undefined;
				// Read the unchanged component after any preceding command has completed.
				await this.setColor(
					pending.hue ?? this.device.getCapabilityValue( 'light_hue' ) ?? FRITZBOX_COLORS.red.hue / this.maxHue,
					pending.saturation ?? this.device.getCapabilityValue( 'light_saturation' ) ?? this.highSaturation
				);
			} )
		};
		this.pendingColor = pending;
		this.colorTask = pending.task;
		return pending.task;
	}

	private async setHue( value: any )
	{
		if( value === null || value === undefined )
		{
			return;
		}

		return this.queueColor( value );
	}

	private async setSaturation( value: any )
	{
		if( value === null || value === undefined )
		{
			return;
		}

		return this.queueColor( undefined, value );
	}
}
