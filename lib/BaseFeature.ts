import { BaseDevice } from './BaseDevice';
import { CapabilityListener } from '../types/CapabilityListener';
import { Capability } from '../types/Capability';
import { CapabilityType } from '../types/CapabilityType';
import Homey from 'homey/lib/Homey';

export abstract class BaseFeature
{
	protected readonly device: BaseDevice;
	private capabilities: Array<Capability> = [];

	public constructor( device: BaseDevice )
	{
		this.device = device;
	}

	public async LateInit()
	{
		this.capabilities = this.Capabilities();
	}

	public async SettingsChanged( oldSettings: object, newSettings: object, changedKeys: string[] )
	{

	}

	public static RegisterCards( homey: Homey )
	{

	}

	public async Update( data: any )
	{
		for( const capability of this.capabilities )
		{
			if( capability.noUpdate === true )
			{
				continue;
			}

			await this.OnCapabilityUpdate( capability, await this.GetValue( capability, data ) );
		}
	}

	public GetCapabilities(): Array<Capability>
	{
		return this.capabilities;
	}

	protected abstract Capabilities(): Array<Capability>;

	public Listeners(): Array<CapabilityListener>
	{
		return [];
	}

	protected async OnCapabilityUpdate( capability: Capability, value: any )
	{
		const oldValue = this.device.getCapabilityValue( capability.name );

		if( oldValue === value ) return;

		await this.OnCapabilityChanged( capability, value, oldValue );
	}

	protected async OnCapabilityChanged( capability: Capability, value: any, oldValue: any )
	{
		//console.debug( 'update ' + capability.name + ' from ' + oldValue + ' to ' + value );
		await this.device.setCapabilityValue( capability.name, value ).catch( this.device.error );
	}

	protected async GetValue( capability: Capability, data: any ): Promise<any>
	{
		if( capability.state === undefined )
		{
			if( capability.valueFunc === undefined )
			{
				return undefined;
			}

			return await capability.valueFunc( undefined );
		}

		// gather data from device
		const value = this.FilterValue( capability.state, data );
		if( capability.type === undefined )
		{
			return value;
		}

		const castedValue = this.CastValue( capability.type, value );

		if( capability.valueFunc === undefined )
		{
			return castedValue;
		}

		return await capability.valueFunc( castedValue );
	}

	private FilterValue( state: string, data: any )
	{
		try
		{
			return state.split( '.' ).reduce( ( o, i ) => o[i], data );
		}
		catch( e )
		{
			this.device.error( 'failed to parse: ' + state );
			this.device.error( 'on: ' + JSON.stringify( data ) );
		}

		return '';
	}

	protected CastValue( type: CapabilityType, value: any ): any
	{
		// precast types to have valid value
		switch( type )
		{
			case CapabilityType.String:
				return String( value );
			case CapabilityType.Integer:
				const intValue: number = parseInt( value );
				// handle NaN as null ( not existent )
				if( isNaN( intValue ) )
				{
					return null;
				}
				return intValue;
			case CapabilityType.Number:
				const floatValue: number = parseFloat( value );
				// handle NaN as null ( not existent )
				if( isNaN( floatValue ) )
				{
					return null;
				}
				return floatValue;
			case CapabilityType.Boolean:
				return value != 0;
		}

		return value;
	}
}
