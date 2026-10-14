import { FritzboxClient } from './FritzboxClient';
import { FritzboxManager } from './FritzboxManager';
import { Device } from 'homey';
import { BaseFeature } from './BaseFeature';
import { FunctionFactory } from './FunctionFactory';
import { Capability } from '../types/Capability';
import { GetHttpErrorCode } from './Helper';

export abstract class BaseDevice extends Device
{
	protected features: Array<BaseFeature> = [];
	protected initialized: boolean = false;

	public override async onInit()
	{
		this.log( 'load device: ' + this.getName() );

		try
		{
			await this.setUnavailable( this.homey.__( 'Message.WaitingForData' ) );
			// try to initialize
			await this.Initialize();
		} catch( error: any )
		{
			this.homey.error( error );
		}
	}

	public GetAPI(): FritzboxClient
	{
		return FritzboxManager.GetSingleton().GetApi();
	}

	public override async onSettings( {
		oldSettings, newSettings, changedKeys
	}: {
		oldSettings: { [key: string]: boolean | string | number | undefined | null };
		newSettings: { [key: string]: boolean | string | number | undefined | null };
		changedKeys: string[]
	} ): Promise<string | void>
	{
		if( !this.initialized )
		{
			return;
		}

		await super.onSettings( { oldSettings, newSettings, changedKeys } );

		for( const feature of this.features )
		{
			await feature.SettingsChanged( oldSettings, newSettings, changedKeys );
		}

		await this.UpdateCapabilities();
	}

	public GetFeature( type: string )
	{
		for( const feature of this.features )
		{
			if( feature.constructor.name === type )
			{
				return feature;
			}
		}
	}

	public async Update( data: any, isCurrent: () => boolean = () => true )
	{
		if( !isCurrent() ) return;
		if( data === null )
		{
			await this.setUnavailable( this.homey.__( 'Message.DeviceUnavailable' ) );
			return;
		}

		// ensure initialization
		await this.Initialize( Number( data.functionbitmask ) );
		if( !isCurrent() ) return;

		// update each capability
		for( const feature of this.features )
		{
			await feature.Update( data, isCurrent );
		}
	};

	protected async GetFunctionMask( functionMask: number ): Promise<number>
	{
		return functionMask;
	}

	protected async Initialize( dataFunctions?: number )
	{
		const functions = await this.GetChangedFunction( dataFunctions );
		if( functions === -1 )
		{
			return;
		}

		this.log( 'init with ' + functions );

		this.features = FunctionFactory.Create( await this.GetFunctionMask( functions ), this );

		await this.UpdateCapabilities();
		this.UpdateListeners();

		for( const feature of this.features )
		{
			await feature.LateInit();
		}

		// update with existing data when adding device ( called from onInit )
		if( dataFunctions === undefined )
		{
			await this.InitUpdate();
		}
	}

	private async GetChangedFunction( dataFunctions?: number ): Promise<number>
	{
		const currentFunction = await this.GetFunctionValue();

		// initial call
		if( dataFunctions === undefined )
		{
			return currentFunction;
		}

		const updatedFunction = await this.GetFunctionValue( dataFunctions );

		// check for change
		if( currentFunction === updatedFunction )
		{
			return -1;
		}

		return updatedFunction;
	}

	protected async UpdateCapabilities()
	{
		const current = this.getCapabilities();
		let added: Array<Capability> = [];
		let defined: string[] = [];

		for( const feature of this.features )
		{
			for( const capability of feature.GetCapabilities() )
			{
				if( capability.hidden === true ) continue;

				// new ?
				if( current.indexOf( capability.name ) === -1 )
				{
					added.push( capability );
				}

				defined.push( capability.name );
			}
		}

		const removed = current.filter( ( entry: string ) => defined.indexOf( entry ) < 0 );
		for( const remove of removed )
		{
			this.homey.log( 'removed ' + remove );
			await this.removeCapability( remove );
		}

		for( const add of added )
		{
			this.homey.log( 'added ' + add.name );
			await this.addCapability( add.name );
			if( add.options !== undefined )
			{
				await this.setCapabilityOptions( add.name, add.options );
			}
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
				this.registerCapabilityListener( listener.name, async( value, opts ) =>
				{
					try
					{
						const callback = listener.callback.bind( feature );
						await callback( value, opts );
					} catch( error: any )
					{
						const code = String( GetHttpErrorCode( error ) );
						// Request URLs, response bodies and error messages can contain login/session data.
						const diagnostic = /^[A-Z0-9_]{1,64}$/.test( code ) ? ': ' + code : '';
						this.homey.error( 'listener exception' + diagnostic );
						throw error;
					}
				} );
			}
		}
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

	private async InitUpdate()
	{
		const fritzbox = FritzboxManager.GetSingleton();
		const data = fritzbox.GetLastData();
		if( data !== undefined )
		{
			await this.Update( fritzbox.FilterDevice( data, this.getData().id ), () => data === fritzbox.GetLastData() );
		}
	}
}
