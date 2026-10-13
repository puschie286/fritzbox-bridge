import { App } from 'homey';
import { Settings, SettingsDefault } from './lib/Settings';
import { HandleHttpError, IsRetryableHttpError, LoginValidationMessage, ValidateUrl } from './lib/Helper';
import { LoginValidation } from './types/LoginValidation';
import { LoginSettings } from './types/LoginSettings';
import { AppSettings } from './types/AppSettings';
import { FritzboxManager } from './lib/FritzboxManager';
import type { FritzApi } from './types/FritzApi';

const LoginSettingKeys = [ 'username', 'password', 'fritzboxip', 'strictssl' ] as const;
const BridgeBooleanKeys = [ 'request_smarthome', 'request_network', 'showunconnected', 'allowmultiple', 'skipdectcheck' ] as const;
const AppSettingKeys = [ ...LoginSettingKeys, 'pollinginterval', ...BridgeBooleanKeys ] as const;

export class FritzboxBridge extends App
{
	// @ts-ignore
	private fritzbox: FritzboxManager;
	private validation?: NodeJS.Timeout;
	private validationTask?: Promise<void>;
	private validationGeneration = 0;
	private notifyValidationChanged!: () => void;
	private validationChanged = new Promise<void>( resolve => { this.notifyValidationChanged = resolve; } );
	private retryAttempt = 0;
	private stopping = false;
	private savingSettings = false;
	private connectionSettings?: LoginSettings;
	private readonly settingsListener = ( name: string ) =>
	{
		void this.applySettings( name ).catch( error => this.homey.error( error ) );
	};

	public override async onInit()
	{
		this.homey.log( 'start Fritzbox Bridge' );
		this.homey.on( 'unload', this.onUninit.bind( this ) );
		this.fritzbox = new FritzboxManager( this.homey );
		this.homey.settings.on( 'set', this.settingsListener );
		this.initializeFritzbox( 5000 );
	}

	public override async onUninit()
	{
		if( this.stopping ) return;
		this.stopping = true;
		this.validationGeneration++;
		this.notifyValidationChanged();
		this.clearValidationTimer();
		this.homey.settings.removeListener( 'set', this.settingsListener );
		this.fritzbox.StopPolling();
	}

	/** Save the complete form before checking its connection settings. */
	public SaveSettings( settings: AppSettings ): void
	{
		if( this.stopping ) return;
		this.validateConnectionSettings( settings );
		if( !Number.isFinite( settings.pollinginterval )
			|| settings.pollinginterval < Settings.POLL_MIN || settings.pollinginterval > Settings.POLL_MAX
			|| !BridgeBooleanKeys.every( key => typeof settings[key] === 'boolean' ) )
		{
			throw new Error( this.homey.__( 'Message.InvalidConfiguration' ) );
		}
		this.storeSettings( settings, AppSettingKeys );
		this.RetryLogin();
	}

	/** Apply connection settings together, or retry the existing configuration. */
	public RetryLogin( settings?: LoginSettings ): void
	{
		if( this.stopping ) return;
		if( settings !== undefined )
		{
			this.validateConnectionSettings( settings );
			this.storeSettings( settings, LoginSettingKeys );
		}
		// Repeated requests for the same pending check must not create more logins.
		if( this.homey.settings.get( Settings.VALIDATION ) === LoginValidation.Progress
			&& this.sameConnectionSettings( this.getConnectionSettings() ) ) return;
		this.initializeFritzbox();
	}

	private validateConnectionSettings( settings: LoginSettings ): void
	{
		if( !settings || typeof settings.username !== 'string' || typeof settings.password !== 'string'
			|| typeof settings.fritzboxip !== 'string' || typeof settings.strictssl !== 'boolean' )
		{
			throw new Error( this.homey.__( 'Message.InvalidConfiguration' ) );
		}
	}

	private storeSettings<T extends object>( settings: T, keys: readonly ( keyof T & string )[] ): void
	{
		const previous = keys.map( key => [ key, this.homey.settings.get( key ) ] as const );
		this.savingSettings = true;
		try
		{
			for( const key of keys )
			{
				if( this.homey.settings.get( key ) !== settings[key] ) this.homey.settings.set( key, settings[key] );
			}
		}
		catch( error )
		{
			for( const [ key, value ] of previous )
			{
				if( this.homey.settings.get( key ) === value ) continue;
				if( value === undefined ) this.homey.settings.unset( key );
				else this.homey.settings.set( key, value );
			}
			throw error;
		}
		finally
		{
			this.savingSettings = false;
		}
	}

	/** Pairing follows the current check, even when settings change while waiting. */
	public async EnsureLogin(): Promise<void>
	{
		while( !this.stopping )
		{
			const state = this.homey.settings.get( Settings.VALIDATION );
			if( state === LoginValidation.Valid ) return;
			if( state !== LoginValidation.Progress ) break;
			const generation = this.validationGeneration;
			await Promise.race( [ this.StartLoginValidation( generation ), this.validationChanged ] );
			if( generation !== this.validationGeneration ) continue;
			break;
		}
		if( !this.stopping && this.isLoginValid() ) return;
		if( this.stopping ) throw new Error( this.homey.__( 'Message.LoginRequired' ) );
		throw new Error( this.homey.__( LoginValidationMessage(
			this.homey.settings.get( Settings.VALIDATION ),
			this.homey.settings.get( Settings.VALIDATION_INFO )
		) ) );
	}

	private async applySettings( name: string )
	{
		if( this.stopping || this.savingSettings ) return;
		switch( name )
		{
			case Settings.USERNAME:
			case Settings.PASSWORD:
			case Settings.FRITZBOX_URL:
			case Settings.STRICT_SSL:
				if( !this.sameConnectionSettings( this.getConnectionSettings() ) ) this.initializeFritzbox();
				break;
			case Settings.POLL_INTERVAL:
				await this.updatePolling();
				break;
		}
	}

	private async updatePolling()
	{
		if( !this.isLoginValid() )
		{
			this.fritzbox.StopPolling();
			return;
		}
		const interval = this.homey.settings.get( Settings.POLL_INTERVAL ) || SettingsDefault.POLL_INTERVAL;
		await this.fritzbox.StartPolling( interval * 1000 );
	}

	private isLoginValid(): boolean
	{
		return this.homey.settings.get( Settings.VALIDATION ) === LoginValidation.Valid;
	}

	private setValidation( state: LoginValidation, info = '' )
	{
		this.homey.settings.set( Settings.VALIDATION_INFO, info );
		this.homey.settings.set( Settings.VALIDATION, state );
	}

	private getConnectionSettings(): LoginSettings
	{
		return {
			username: this.homey.settings.get( Settings.USERNAME ) ?? SettingsDefault.USERNAME,
			password: this.homey.settings.get( Settings.PASSWORD ) ?? SettingsDefault.PASSWORD,
			fritzboxip: this.homey.settings.get( Settings.FRITZBOX_URL ) ?? SettingsDefault.FRITZBOX_URL,
			strictssl: this.homey.settings.get( Settings.STRICT_SSL ) ?? SettingsDefault.STRICT_SSL
		};
	}

	private sameConnectionSettings( settings: LoginSettings ): boolean
	{
		const current = this.connectionSettings;
		return current !== undefined && current.username === settings.username && current.password === settings.password
			&& current.fritzboxip === settings.fritzboxip && current.strictssl === settings.strictssl;
	}

	private initializeFritzbox( delay = 100 )
	{
		this.clearValidationTimer();
		const generation = ++this.validationGeneration;
		this.notifyValidationChanged();
		this.validationChanged = new Promise<void>( resolve => { this.notifyValidationChanged = resolve; } );
		this.retryAttempt = 0;
		this.validationTask = undefined;
		this.setValidation( LoginValidation.Progress );
		this.homey.settings.unset( Settings.DECT_SUPPORT );
		this.homey.settings.unset( Settings.DECT_ENABLED );
		this.connectionSettings = this.getConnectionSettings();
		const { username, password, fritzboxip, strictssl } = this.connectionSettings;
		const url = fritzboxip.trim() !== '' ? fritzboxip : SettingsDefault.FRITZBOX_URL;
		this.fritzbox.Connect( username, password, ValidateUrl( url ), strictssl );
		this.scheduleValidation( generation, delay );
	}

	private clearValidationTimer()
	{
		if( this.validation !== undefined )
		{
			this.homey.clearTimeout( this.validation );
			this.validation = undefined;
		}
	}

	private isCurrentValidation( generation: number ): boolean
	{
		return !this.stopping && generation === this.validationGeneration;
	}

	private scheduleValidation( generation: number, delay: number )
	{
		this.clearValidationTimer();
		this.validation = this.homey.setTimeout( () =>
		{
			if( !this.isCurrentValidation( generation ) ) return;
			this.validation = undefined;
			void this.StartLoginValidation( generation );
		}, delay );
	}

	private StartLoginValidation( generation: number ): Promise<void>
	{
		if( !this.isCurrentValidation( generation ) ) return Promise.resolve();
		if( this.validationTask !== undefined ) return this.validationTask;
		this.clearValidationTimer();
		this.setValidation( LoginValidation.Progress );
		const task = this.ValidateLogin( generation );
		this.validationTask = task;
		void task.then( () =>
		{
			if( this.validationTask === task ) this.validationTask = undefined;
		} );
		return task;
	}

	private async ValidateLogin( generation: number ): Promise<void>
	{
		let api: FritzApi;
		try
		{
			api = this.fritzbox.GetApi();
			await api.login();
		}
		catch( error: any )
		{
			if( !this.isCurrentValidation( generation ) ) return;
			const info = HandleHttpError( error ) || 'Message.ErrorLogin';
			this.homey.error( info );
			this.setValidation( LoginValidation.Invalid, info );
			if( IsRetryableHttpError( error ) )
			{
				const delay = Math.min( 5000 * ( 2 ** this.retryAttempt ), 60000 );
				this.retryAttempt++;
				this.scheduleValidation( generation, delay );
			}
			return;
		}
		if( !this.isCurrentValidation( generation ) ) return;
		let result: any;
		try
		{
			// Detect DECT on every new connection, independently of polling preferences.
			result = await api.getFritzboxOverview();
		}
		catch( error: any )
		{
			if( !this.isCurrentValidation( generation ) ) return;
			this.homey.error( 'overview unavailable after login', error );
		}
		if( !this.isCurrentValidation( generation ) ) return;
		if( result !== undefined )
		{
			this.homey.settings.set( Settings.DECT_SUPPORT, this.DectSupported( result ) );
			this.homey.settings.set( Settings.DECT_ENABLED, this.DectEnabled( result ) );
		}
		this.retryAttempt = 0;
		this.setValidation( LoginValidation.Valid );
		this.homey.log( 'validate login: success' );
		void this.UpdateAfterLogin( result, generation );
	}

	private async UpdateAfterLogin( result: any, generation: number ): Promise<void>
	{
		try
		{
			if( result !== undefined ) await this.fritzbox.updateFritzboxData( result );
		}
		catch( error: any )
		{
			this.homey.error( 'device update failed after login', error );
		}
		if( !this.isCurrentValidation( generation ) ) return;
		try
		{
			await this.updatePolling();
		}
		catch( error: any )
		{
			this.homey.error( 'polling setup failed after login', error );
		}
	}

	private DectEnabled( result: any ): boolean
	{
		return result?.data?.dect?.led === 'led green';
	}

	private DectSupported( result: any ): boolean
	{
		return result?.data?.dect !== undefined;
	}
}

module.exports = FritzboxBridge;
