"use strict";

let Helper = null;
const ButtonLoadingClass = 'is-loading';

class SettingHelper
{
	#homey;
	#saveButton;
	#loginInfo;
	#debugButton;
	#saving = false;
	#validationGeneration = 0;
	#validationTimer;

	constructor( homey, saveId, infoId, debugId )
	{
		this.#homey = homey;
		this.#saveButton = document.getElementById( saveId );
		this.#loginInfo = document.getElementById( infoId );
		this.#debugButton = document.getElementById( debugId );
	}

	Configure( settingConfigs )
	{
		this.#InitInfo();
		this.#InitSettings( settingConfigs );
		this.#InitDebug();
	}

	#InitDebug()
	{
		this.#debugButton.addEventListener( 'click', async function()
		{
			this.#DisableDebug();

			// ask for sending data
			/*if( !await this.#homey.confirm( this.#homey.__( 'Message.SendDebugData' ) ) )
			{
				this.#ResetDebug();
				return;
			}*/

			this.#homey.api( 'GET', '/devices?upload=true', {}, async function( err, result )
			{
				if( err || result === 'failed' )
				{
					this.#ResetDebug();
					console.debug( JSON.stringify( err ) );
					this.#homey.alert( this.#homey.__( 'Message.SendFailed' ) );
					return;
				}
				
				this.#homey.api( 'GET', '/network-devices?upload=true', {}, async function( err2, result2 )
				{
					if( err2 || result2 === 'failed' )
					{
						this.#ResetDebug();
						console.debug( JSON.stringify( err2 ) );
						this.#homey.alert( this.#homey.__( 'Message.SendFailed' ) );
						return;
					}
					
					this.#homey.alert( this.#homey.__( 'Message.SendSuccess' ) );
					this.#ResetDebug();
				}.bind( this ) );
			}.bind( this ) )
		}.bind( this ) );
	}

	#InitInfo()
	{
		this.#Validate();
	}

	#InitSettings( settingConfigs )
	{
		this.#DisableSave();
		const loaded = Promise.all( settingConfigs.map( config => this.#Load( config.id, config.type, config.default ) ) );
		void loaded.then( () =>
		{
			if( !this.#saving ) this.#ResetSave();
		}, () => this.#homey.alert( this.#homey.__( 'Message.LoadSettingsFailed' ) ) );

		// register save
		this.#saveButton.addEventListener( 'click', async function()
		{
			this.#saving = true;
			this.#DisableSave();
			try
			{
				await loaded;
				const settings = {};
				for( const { id, type } of settingConfigs )
				{
					const target = document.getElementById( id );
					settings[id] = type === 'checkbox' ? target.checked
						: type === 'number' ? Number( target.value ) : target.value;
				}
				await new Promise( ( resolve, reject ) =>
				{
					this.#homey.api( 'POST', '/retry-login', { settings }, ( error, result ) =>
					{
						if( error ) reject( error );
						else resolve( result );
					} );
				} );
			}
			catch( error )
			{
				this.#homey.alert( error );
			}
			finally
			{
				this.#saving = false;
				this.#ResetSave();
				this.#Validate();
			}
		}.bind( this ) );
		this.#homey.on( 'settings.set', function( name )
		{
			if( name === 'validation' || name === 'validationInfo' ) this.#Validate();
		}.bind( this ) );
	}

	#DisableSave()
	{
		this.#saveButton.disabled = true;
		this.#saveButton.classList.add( ButtonLoadingClass );
	}

	#ResetSave()
	{
		this.#saveButton.disabled = false;
		this.#saveButton.classList.remove( ButtonLoadingClass );
	}

	#DisableDebug()
	{
		this.#debugButton.disabled = true;
	}

	#ResetDebug()
	{
		this.#debugButton.disabled = false;
	}

	#SetLocalizedInfo( key )
	{
		this.#loginInfo.innerText = this.#homey.__( key );
	}

	#Load( id, type, defaultValue )
	{
		return new Promise( ( resolve, reject ) => this.#homey.get( id, ( error, value ) =>
		{
			if( error ) return reject( error );
			const Target = document.getElementById( id );
			if( ( value === null || value === undefined ) && defaultValue !== undefined )
			{
				value = defaultValue;
			}
			if( type === 'checkbox' )
			{
				Target.checked = Boolean( value );
			}
			else
			{
				Target.value = value;
			}

			resolve();
		} ) );
	}

	#Validate()
	{
		const generation = ++this.#validationGeneration;
		if( this.#validationTimer !== undefined )
		{
			clearTimeout( this.#validationTimer );
			this.#validationTimer = undefined;
		}
		this.#homey.get( 'validation', function( error, value )
		{
			if( generation !== this.#validationGeneration || this.#saving ) return;
			if( error )
			{
				this.#SetLocalizedInfo( 'Message.ErrorLogin' );
				return;
			}
			const state = Number.parseInt( value );
			if( state === 2 )
			{
				this.#SetLocalizedInfo( 'Message.LoginChecking' );
				this.#validationTimer = setTimeout( () =>
				{
					if( generation === this.#validationGeneration ) this.#Validate();
				}, 500 );
				return;
			}
			if( state === 1 )
			{
				this.#SetLocalizedInfo( 'Message.ValidLogin' );
				return;
			}
			if( state !== 0 )
			{
				this.#SetLocalizedInfo( 'Message.LoginRequired' );
				return;
			}
			this.#homey.get( 'validationInfo', function( infoError, info )
			{
				if( generation !== this.#validationGeneration || this.#saving ) return;
				const key = !infoError && typeof info === 'string' && info.startsWith( 'Message.' )
					? info : 'Message.ErrorLogin';
				this.#SetLocalizedInfo( key );
			}.bind( this ) );
		}.bind( this ) );
	}

	static AutoConfig( Homey, SaveId, StatusId, DebugId, ValueIDArray )
	{
		Helper = new SettingHelper( Homey, SaveId, StatusId, DebugId );

		Helper.Configure( ValueIDArray );

		Homey.ready();
	};
}
