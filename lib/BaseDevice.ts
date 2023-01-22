import { CapabilityDefinition } from "../types/CapabilityDefinition";
import { CapabilityType } from "../types/CapabilityType";
import { CapabilityOption } from "../types/CapabilityOption";
import { Availability, Capability } from "../types/Capability";
import { CapabilityListener } from "../types/CapabilityListener";
import { FritzApi } from "../types/FritzApi";
import { FritzboxManager } from "./FritzboxManager";
import { Device } from "homey";

export abstract class BaseDevice extends Device
{
	// @ts-ignore
	protected api: FritzApi;

	async onInit()
	{
		this.log( 'load device: ' + this.getName() );

		try
		{
			this.api = FritzboxManager.GetSingleton().GetApi();

			// update functions
			await this.UpdateCapabilities();

			this.RegisterListener();
		}
		catch( error: any )
		{
			console.debug( error );
			this.homey.error( error );
		}
	}

	private RegisterListener()
	{
		const listeners = this.CapabilityListener();
		if( listeners === null ) return;

		for( const [name, callback] of Object.entries( listeners ) )
		{
			this.registerCapabilityListener( name, callback.bind( this ) );
		}
	}

	private async UpdateCapabilities()
	{
		const registeredCapabilities = this.getCapabilities();
		let definedCapabilities: string[] = [];

		for( const [ name, capability ] of Object.entries( this.CapabilityDefinitions() ) )
		{
			if( capability.hidden === true ) continue;

			definedCapabilities.push( name );
		}

		const removed = registeredCapabilities.filter( ( entry: string ) => definedCapabilities.indexOf( entry ) < 0 );
		const added = definedCapabilities.filter( ( entry: string ) => registeredCapabilities.indexOf( entry ) < 0 );

		for( const addedCapability of added )
		{
			this.homey.log( 'added ' + addedCapability );
			await this.addCapability( addedCapability );
		}
		for( const removedCapability of removed )
		{
			this.homey.log( 'removed ' + removedCapability );
			await this.removeCapability( removedCapability );
		}
	}

	public async Update( data: any )
	{
		if( data === null )
		{
			console.debug( 'device data not found: ' + this.getName() );
			// TODO: better handling of no data
			return;
		}

		// update each capability
		const capabilities = this.CapabilityDefinitions();
		for( const [name, capability] of Object.entries( capabilities ) )
		{
			let value = undefined;

			if( capability.state !== undefined )
			{
				// gather data from device
				// TODO: make gathering more stable ( if property doesnt exist )
				value = capability.state.split( '.' ).reduce( ( o, i ) => o[i], data );

				// check for casting
				if( capability.option !== CapabilityOption.NoCast && capability.type !== undefined )
				{
					value = this.CastValue( capability.type, value );
				}
			}

			await this.UpdateProperty( name, capability, value );
		}
	};

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

	protected async HandleAvailability( value: boolean )
	{
		// skip same state
		if( value === this.getAvailable() ) return;

		if( value )
		{
			await this.setAvailable();
			this.log( 'Device ' + this.getName() + ' got available' );
		}
		else
		{
			await this.setUnavailable();
			this.log( 'Device ' + this.getName() + ' got unavailable' );
		}
	}

	// default update implementation
	protected async UpdateProperty( name: string, capability: Capability, value: any )
	{
		// check for global state / availability
		if( name === Availability )
		{
			await this.HandleAvailability( value );
			return;
		}

		// check for value function
		if( capability.valueFunc !== undefined )
		{
			value = await capability.valueFunc( value );
		}

		const oldValue = this.getCapabilityValue( name );

		await this.capabilityUpdated( name, value, oldValue );

		if( oldValue !== value )
		{
			await this.capabilityChanged( name, value, oldValue );
		}
	}

	protected abstract CapabilityDefinitions(): CapabilityDefinition;

	protected CapabilityListener(): CapabilityListener|null
	{
		return null;
	}

	/**
	 * called on capability update
	 * @param name capability id
	 * @param value new value
	 * @param oldValue old value
	 */
	protected async capabilityUpdated( name: string, value: any, oldValue: any )
	{

	}

	/**
	 * called on capability value has changed
	 * @param name capability id
	 * @param value new value
	 * @param oldValue old value
	 */
	protected async capabilityChanged( name: string, value: any, oldValue: any )
	{
		console.debug( 'update ' + name + ' from ' + oldValue + ' to ' + value );
		await this.setCapabilityValue( name, value ).catch( this.error.bind( this ) );
	}
}
