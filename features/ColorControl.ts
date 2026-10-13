import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';
import { CapabilityListener } from '../types/CapabilityListener';
import { FritzboxColor, FritzboxTemperature } from '../types/FritzboxTypes';
import { Closest } from '../lib/Helper';
import { FRITZBOX_COLORS } from '../lib/FritzboxColors';

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

	private sendHue: number | null = null;
	private sendSaturation: number | null = null;

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

	private async setColor()
	{
		// ignore when not color mode
		if( this.device.getCapabilityValue( 'light_mode' ) !== 'color' )
		{
			this.sendHue = null;
			this.sendSaturation = null;
			return;
		}

		// skip if not both set
		if( this.sendHue == null || this.sendSaturation == null )
		{
			return;
		}

		const upScaledHue = this.sendHue * this.maxHue;
		const validHue = Closest( upScaledHue, this.hueValues );

		const validSaturation = Closest( this.sendSaturation, [ this.lowSaturation, this.midSaturation, this.highSaturation ] );

		// clear
		this.sendHue = null;
		this.sendSaturation = null;

		const apiHue = ColorControl.ConvertColorHue( validHue );
		const apiSaturation = this.ConvertSaturationToEnum( apiHue, validSaturation );

		this.lastHue = validHue;
		this.device.log( 'send setColor: ' + apiSaturation + ', ' + apiHue );
		await this.device.GetAPI().setColor( this.device.getData().id, apiHue, apiSaturation, 500 );
	}

	private async setHue( value: any )
	{
		if( value === null || value === undefined )
		{
			return;
		}

		this.sendHue = value;
		return this.setColor();
	}

	private async setSaturation( value: any )
	{
		if( value === null || value === undefined )
		{
			return;
		}

		this.sendSaturation = value;
		return this.setColor();
	}
}
