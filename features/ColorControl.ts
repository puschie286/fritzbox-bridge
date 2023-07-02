import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';
import { CapabilityListener } from '../types/CapabilityListener';
import { FritzApiColor, FritzApiTemperature } from '../types/FritzApi';
import { Closest } from '../lib/Helper';

export class ColorControl extends BaseFeature
{
	private readonly minTemperature: number = 2700;
	private readonly maxTemperature: number = 6500;
	private readonly temperatureValues: Array<number> = [ 2700, 3000, 3400, 3800, 4200, 4700, 5300, 5900, 6500 ];
	private readonly maxHue: number = 360;
	private readonly hueValues: Array<number> = [ 35, 52, 92, 120, 160, 195, 212, 225, 266, 296, 335, 358 ];
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

	private static ConvertColorHue( value: number | null ): FritzApiColor
	{
		switch( value )
		{
			case 35:
				return FritzApiColor.Orange;
			case 52:
				return FritzApiColor.Yellow;
			case 92:
				return FritzApiColor.Lime;
			case 120:
				return FritzApiColor.Green;
			case 160:
				return FritzApiColor.Turquoise;
			case 195:
				return FritzApiColor.Cyan;
			case 212:
				return FritzApiColor.Lightblue;
			case 225:
				return FritzApiColor.Blue;
			case 266:
				return FritzApiColor.Purple;
			case 296:
				return FritzApiColor.Magenta;
			case 335:
				return FritzApiColor.Pink;
			case 358:
				return FritzApiColor.Red;
		}

		return FritzApiColor.Red;
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
			name: 'light_saturation',
			state: 'colorcontrol.saturation',
			type: CapabilityType.Number,
			valueFunc: this.MapFritzboxSaturation.bind( this )
		}, {
			name: 'light_hue',
			state: 'colorcontrol.hue',
			type: CapabilityType.Integer,
			valueFunc: this.MapFritzboxHue.bind( this )
		} ];
	}

	Listeners(): Array<CapabilityListener>
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

	private static ConvertTemperatureToEnum( value: number ): FritzApiTemperature
	{
		switch( value )
		{
			case 2700:
				return FritzApiTemperature.T2700;
			case 3000:
				return FritzApiTemperature.T3000;
			case 3400:
				return FritzApiTemperature.T3400;
			case 3800:
				return FritzApiTemperature.T3800;
			case 4200:
				return FritzApiTemperature.T4200;
			case 4700:
				return FritzApiTemperature.T4700;
			case 5300:
				return FritzApiTemperature.T5300;
			case 5900:
				return FritzApiTemperature.T5900;
			case 6500:
				return FritzApiTemperature.T6500;
		}

		return FritzApiTemperature.T2700;
	}

	private ConvertSaturationToEnum( hue: FritzApiColor, value: number ): number
	{
		switch( hue )
		{
			case FritzApiColor.Orange:
				switch( value )
				{
					case this.highSaturation:
						return 214;
					case this.midSaturation:
						return 140;
					case this.lowSaturation:
						return 72;
				}
				break;
			case FritzApiColor.Yellow:
				switch( value )
				{
					case this.highSaturation:
						return 153;
					case this.midSaturation:
						return 102;
					case this.lowSaturation:
						return 51;
				}
				break;
			case FritzApiColor.Lime:
				switch( value )
				{
					case this.highSaturation:
						return 123;
					case this.midSaturation:
						return 102;
					case this.lowSaturation:
						return 51;
				}
				break;
			case FritzApiColor.Green:
				switch( value )
				{
					case this.highSaturation:
						return 160;
					case this.midSaturation:
						return 82;
					case this.lowSaturation:
						return 38;
				}
				break;
			case FritzApiColor.Turquoise:
				switch( value )
				{
					case this.highSaturation:
						return 145;
					case this.midSaturation:
						return 84;
					case this.lowSaturation:
						return 38;
				}
				break;
			case FritzApiColor.Cyan:
				switch( value )
				{
					case this.highSaturation:
						return 179;
					case this.midSaturation:
						return 118;
					case this.lowSaturation:
						return 59;
				}
				break;
			case FritzApiColor.Lightblue:
				switch( value )
				{
					case this.highSaturation:
						return 169;
					case this.midSaturation:
						return 110;
					case this.lowSaturation:
						return 56;
				}
				break;
			case FritzApiColor.Blue:
				switch( value )
				{
					case this.highSaturation:
						return 204;
					case this.midSaturation:
						return 135;
					case this.lowSaturation:
						return 67;
				}
				break;
			case FritzApiColor.Purple:
				switch( value )
				{
					case this.highSaturation:
						return 169;
					case this.midSaturation:
						return 110;
					case this.lowSaturation:
						return 54;
				}
				break;
			case FritzApiColor.Magenta:
				switch( value )
				{
					case this.highSaturation:
						return 140;
					case this.midSaturation:
						return 92;
					case this.lowSaturation:
						return 46;
				}
				break;
			case FritzApiColor.Pink:
				switch( value )
				{
					case this.highSaturation:
						return 180;
					case this.midSaturation:
						return 107;
					case this.lowSaturation:
						return 51;
				}
				break;
			case FritzApiColor.Red:
				switch( value )
				{
					case this.highSaturation:
						return 180;
					case this.midSaturation:
						return 112;
					case this.lowSaturation:
						return 54;
				}
				break;

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
		if( value === null )
		{
			return null;
		}

		this.lastHue = value;
		return value / this.maxHue;
	}

	private MapFritzboxSaturation( value: number | null ): number | null
	{
		if( this.lastHue === null )
		{
			return null;
		}

		switch( this.lastHue )
		{
			case 35:
				switch( value )
				{
					case 214:
						return this.highSaturation;
					case 140:
						return this.midSaturation;
					case 72:
						return this.lowSaturation;
				}
				break;
			case 52:
				switch( value )
				{
					case 153:
						return this.highSaturation;
					case 102:
						return this.midSaturation;
					case 51:
						return this.lowSaturation;
				}
				break;
			case 92:
				switch( value )
				{
					case 123:
						return this.highSaturation;
					case 102:
						return this.midSaturation;
					case 51:
						return this.lowSaturation;
				}
				break;
			case 120:
				switch( value )
				{
					case 160:
						return this.highSaturation;
					case 82:
						return this.midSaturation;
					case 38:
						return this.lowSaturation;
				}
				break;
			case 160:
				switch( value )
				{
					case 145:
						return this.highSaturation;
					case 84:
						return this.midSaturation;
					case 38:
						return this.lowSaturation;
				}
				break;
			case 195:
				switch( value )
				{
					case 179:
						return this.highSaturation;
					case 118:
						return this.midSaturation;
					case 59:
						return this.lowSaturation;
				}
				break;
			case 212:
				switch( value )
				{
					case 169:
						return this.highSaturation;
					case 110:
						return this.midSaturation;
					case 56:
						return this.lowSaturation;
				}
				break;
			case 225:
				switch( value )
				{
					case 204:
						return this.highSaturation;
					case 135:
						return this.midSaturation;
					case 67:
						return this.lowSaturation;
				}
				break;
			case 266:
				switch( value )
				{
					case 169:
						return this.highSaturation;
					case 110:
						return this.midSaturation;
					case 54:
						return this.lowSaturation;
				}
				break;
			case 296:
				switch( value )
				{
					case 140:
						return this.highSaturation;
					case 92:
						return this.midSaturation;
					case 46:
						return this.lowSaturation;
				}
				break;
			case 335:
				switch( value )
				{
					case 180:
						return this.highSaturation;
					case 107:
						return this.midSaturation;
					case 51:
						return this.lowSaturation;
				}
				break;
			case 358:
				switch( value )
				{
					case 180:
						return this.highSaturation;
					case 112:
						return this.midSaturation;
					case 54:
						return this.lowSaturation;
				}
				break;
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
