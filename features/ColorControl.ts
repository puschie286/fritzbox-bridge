import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';
import { CapabilityListener } from '../types/CapabilityListener';
import { FritzApiColor, FritzApiTemperature } from '../types/FritzApi';

export class ColorControl extends BaseFeature
{
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

	private static ConvertColorHue( value: number | null ): string | null
	{
		switch( value )
		{
			case 358:
				return 'red';
			case 35:
				return 'orange';
			case 52:
				return 'yellow';
			case 92:
				return 'lime';
			case 120:
				return 'green';
			case 160:
				return 'turquoise';
			case 195:
				return 'cyan';
			case 212:
				return 'lightblue';
			case 225:
				return 'blue';
			case 266:
				return 'purple';
			case 296:
				return 'magenta';
			case 335:
				return 'pink';
		}

		return null;
	}

	private ConvertColorSaturation( value: number | null ): string | null
	{
		const color = this.device.getCapabilityValue( 'color_hue' );
		if( color === null || color === undefined )
		{
			return null;
		}

		switch( color )
		{
			case 'red':
				switch( value )
				{
					case 180:
						return 'high';
					case 112:
						return 'mid';
					case 54:
						return 'low';
				}
				break;
			case 'orange':
				switch( value )
				{
					case 214:
						return 'high';
					case 140:
						return 'mid';
					case 72:
						return 'low';
				}
				break;
			case 'yellow':
				switch( value )
				{
					case 153:
						return 'high';
					case 102:
						return 'mid';
					case 51:
						return 'low';
				}
				break;
			case 'lime':
				switch( value )
				{
					case 123:
						return 'high';
					case 102:
						return 'mid';
					case 51:
						return 'low';
				}
				break;
			case 'green':
				switch( value )
				{
					case 160:
						return 'high';
					case 82:
						return 'mid';
					case 38:
						return 'low';
				}
				break;
			case 'turquoise':
				switch( value )
				{
					case 145:
						return 'high';
					case 84:
						return 'mid';
					case 38:
						return 'low';
				}
				break;
			case 'cyan':
				switch( value )
				{
					case 179:
						return 'high';
					case 118:
						return 'mid';
					case 59:
						return 'low';
				}
				break;
			case 'lightblue':
				switch( value )
				{
					case 169:
						return 'high';
					case 110:
						return 'mid';
					case 56:
						return 'low';
				}
				break;
			case 'blue':
				switch( value )
				{
					case 204:
						return 'high';
					case 135:
						return 'mid';
					case 67:
						return 'low';
				}
				break;
			case 'purple':
				switch( value )
				{
					case 169:
						return 'high';
					case 110:
						return 'mid';
					case 54:
						return 'low';
				}
				break;
			case 'magenta':
				switch( value )
				{
					case 140:
						return 'high';
					case 92:
						return 'mid';
					case 46:
						return 'low';
				}
				break;
			case 'pink':
				switch( value )
				{
					case 180:
						return 'high';
					case 107:
						return 'mid';
					case 51:
						return 'low';
				}
				break;
		}

		return null;
	}

	protected Capabilities(): Array<Capability>
	{
		return [ {
			name: 'light_mode',
			state: 'colorcontrol.current_mode',
			type: CapabilityType.Integer,
			valueFunc: ColorControl.ConvertColorMode,
			options: {
				'setable': false
			}
		}, {
			name: 'color_temperature', state: 'colorcontrol.temperature', type: CapabilityType.Integer
		}, {
			name: 'color_hue',
			state: 'colorcontrol.hue',
			type: CapabilityType.Integer,
			valueFunc: ColorControl.ConvertColorHue
		}, {
			name: 'color_saturation',
			state: 'colorcontrol.saturation',
			type: CapabilityType.Integer,
			valueFunc: this.ConvertColorSaturation.bind( this )
		} ];
	}

	Listeners(): Array<CapabilityListener>
	{
		return [ {
			name: 'color_temperature', callback: this.setTemperature
		}, {
			name: 'color_hue', callback: this.setHue
		}, {
			name: 'color_saturation', callback: this.setSaturation
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

	private static ConvertSaturationToEnum( value: string ): number
	{
		switch( value )
		{
			case 'high':
				return 0;
			case 'mid':
				return 1;
			case 'low':
				return 2;
		}

		return 0;
	}

	private static ConvertColorToEnum( value: string ): FritzApiColor
	{
		switch( value )
		{
			case 'red':
				return FritzApiColor.Red;
			case 'orange':
				return FritzApiColor.Orange;
			case 'yellow':
				return FritzApiColor.Yellow;
			case 'lime':
				return FritzApiColor.Lime;
			case 'green':
				return FritzApiColor.Green;
			case 'turquoise':
				return FritzApiColor.Turquoise;
			case 'cyan':
				return FritzApiColor.Cyan;
			case 'lightblue':
				return FritzApiColor.Lightblue;
			case 'blue':
				return FritzApiColor.Blue;
			case 'purple':
				return FritzApiColor.Purple;
			case 'magenta':
				return FritzApiColor.Magenta;
			case 'pink':
				return FritzApiColor.Pink;
		}

		return FritzApiColor.Red;
	}

	private setTemperature( value: any )
	{
		if( value === null || value === undefined )
		{
			return;
		}

		if( this.device.getCapabilityValue( 'light_mode' ) !== 'temperature' )
		{
			return;
		}

		const intValue = parseInt( value );

		const enumValue = ColorControl.ConvertTemperatureToEnum( intValue );

		this.device.GetAPI().setColorTemperature( this.device.getData().id, enumValue, 500 );
	}

	private async setHue( value: any )
	{
		if( value === null || value === undefined )
		{
			return;
		}

		if( this.device.getCapabilityValue( 'light_mode' ) !== 'color' )
		{
			return;
		}

		const saturation = this.device.getCapabilityValue( 'color_saturation' );

		if( saturation === null || saturation === undefined )
		{
			return;
		}

		const saturationValue = ColorControl.ConvertSaturationToEnum( saturation );
		const colorValue = ColorControl.ConvertColorToEnum( value );

		await this.device.GetAPI().setColor( this.device.getData().id, colorValue, saturationValue, 500 );
	}

	private async setSaturation( value: any )
	{
		if( value === null || value === undefined )
		{
			return;
		}

		if( this.device.getCapabilityValue( 'light_mode' ) !== 'color' )
		{
			return;
		}

		const color = this.device.getCapabilityValue( 'color_saturation' );

		if( color === null || color === undefined )
		{
			return;
		}

		const saturationValue = ColorControl.ConvertSaturationToEnum( value );
		const colorValue = ColorControl.ConvertColorToEnum( value );

		await this.device.GetAPI().setColor( this.device.getData().id, colorValue, saturationValue, 500 );
	}
}
