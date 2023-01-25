import { FritzApi } from "../types/FritzApi";
import { FritzboxManager } from "./FritzboxManager";
import { Device } from "homey";
import { BaseFeature } from "./BaseFeature";
import { FunctionFactory } from "./FunctionFactory";
import { Capability } from "../types/Capability";

export abstract class BaseDevice extends Device
{
	// @ts-ignore
	protected api: FritzApi;
	protected features: Array<BaseFeature> = [];
	protected initialized: boolean = false;

	async onInit()
	{
		this.log( 'load device: ' + this.getName() );

		try
		{
			this.api = FritzboxManager.GetSingleton().GetApi();

			// try to initialize
			await this.Initialize();
		}
		catch( error: any )
		{
			console.debug( error );
			this.homey.error( error );
		}
	}

	protected async GetFunctionMask( functionMask: number ): Promise<number>
	{
		return functionMask;
	}

	public GetAPI(): FritzApi
	{
		return this.api;
	}

	private async GetFunctionValue( dataFunctions?: number ): Promise<number>
	{
		const functions: number = Number( this.getStoreValue( 'functions' ) );

		if( typeof dataFunctions === 'number' && dataFunctions > 0 && dataFunctions !== functions )
		{
			await this.setStoreValue( 'functions', dataFunctions ).catch( this.error );
			return dataFunctions;
		}

		if( functions > 0 )
		{
			return functions;
		}

		return -1;
	}

	protected async Initialize( dataFunctions?: number)
	{
		if( this.initialized )
		{
			return;
		}

		let functions = await this.GetFunctionValue( dataFunctions );
		if( functions === -1 )
		{
			return;
		}

		this.initialized = true;

		this.log( 'init with ' + functions );

		this.features = FunctionFactory.Create( await this.GetFunctionMask( functions ), this );

		await this.UpdateCapabilities();
		this.UpdateListeners();

		// update with existing data when adding device ( called from onInit )
		if( dataFunctions === undefined )
		{
			await this.InitUpdate();
		}
	}

	private async InitUpdate()
	{
		const fritzbox = FritzboxManager.GetSingleton();
		await this.Update( fritzbox.FilterDevice( fritzbox.GetLastData(), this.getData().id ) );
	}

	protected async UpdateCapabilities()
	{
		const current = this.getCapabilities();
		let added: Array<Capability> = [];
		let defined: string[] = [];

		for( const feature of this.features )
		{
			for( const capability of feature.Capabilities() )
			{
				if( capability.hidden === true ) continue;

				// new ?
				if( current.indexOf( capability.name ) < 0 )
				{
					added.push( capability );
				}

				defined.push( capability.name );
			}
		}

		const removed = current.filter( ( entry: string ) => defined.indexOf( entry ) < 0 );

		for( const add of added )
		{
			this.homey.log( 'added ' + add.name );
			await this.addCapability( add.name );
			if( add.options !== undefined )
			{
				await this.setCapabilityOptions( add.name, add.options );
			}
		}
		for( const remove of removed )
		{
			this.homey.log( 'removed ' + remove );
			await this.removeCapability( remove );
		}
	}

	protected UpdateListeners()
	{
		for( const feature of this.features )
		{
			const listeners = feature.Listeners();
			if( listeners === null ) continue;

			for( const listener of listeners )
			{
				this.registerCapabilityListener( listener.name, listener.callback.bind( feature ) );
			}
		}
	}

	public async Update( data: any )
	{
		if( data === null )
		{
			console.debug( 'device data not found: ' + this.getName() );
			return;
		}

		// ensure initialization
		await this.Initialize( Number( data.functionbitmask ) );

		// update each capability
		for( const feature of this.features )
		{
			await feature.Update( data );
		}
	};
}
