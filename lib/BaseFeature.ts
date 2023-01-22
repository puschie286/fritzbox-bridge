import { BaseDevice } from "./BaseDevice";
import { CapabilityListener } from "../types/CapabilityListener";
import { Capability } from "../types/Capability";
import { CapabilityType } from "../types/CapabilityType";

export abstract class BaseFeature
{
	protected readonly device: BaseDevice;

	public constructor( device: BaseDevice )
	{
		this.device = device;
	}

	public async Update( data: any )
	{
		for( const capability of this.Capabilities() )
		{
			await this.OnCapabilityUpdate( capability, await this.GetValue( capability, data ) );
		}
	}

	protected async OnCapabilityUpdate( capability: Capability, value: any )
	{
		const oldValue = this.device.getCapabilityValue( capability.name );

		if( oldValue === value ) return;

		await this.OnCapabilityChanged( capability, value, oldValue );
	}

	protected async OnCapabilityChanged( capability: Capability, value: any, oldValue: any )
	{
		console.debug( 'update ' + capability.name + ' from ' + oldValue + ' to ' + value );
		await this.device.setCapabilityValue( capability.name, value ).catch( this.device.error );
	}

	protected async GetValue( capability: Capability, data: any ): Promise<any>
	{
		if( capability.state === undefined )
		{
			return undefined;
		}

		// gather data from device
		const value = capability.state.split( '.' ).reduce( ( o, i ) => o[i], data );

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

	public abstract Capabilities(): Array<Capability>;

	public Listeners(): Array<CapabilityListener>
	{
		return [];
	}
}
