"use strict";

let Helper = null;
const ButtonLoadingClass = 'is-loading';

class SettingHelper
{
	#homey;
	#saveButton;
	#loginInfo;
	#debugButton;
	#values = [];

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
		// load setting values
		for( const settingConfig of settingConfigs )
		{
			this.#Load( settingConfig.id, settingConfig.type, settingConfig.default );
		}

		// register save
		this.#saveButton.addEventListener( 'click', function()
		{
			this.#DisableSave();

			let hasChanges = false;
			for( const settingConfig of settingConfigs )
			{
				if( this.#Save( settingConfig.id, settingConfig.type ) )
				{
					hasChanges = true;
				}
			}

			if( !hasChanges )
			{
				this.#ResetSave();
			}
		}.bind( this ) );

		// callback for settings
		this.#homey.on( 'settings.set', function( name )
		{
			if( name !== 'validation' )
			{
				// no validation for bridge settings
				if( [
					'allowmultiple',
					'showunconnected',
					'pollinginterval',
					'pollingactive',
					'skipdectcheck'
				].includes( name ) )
				{
					this.#ResetSave();
				}
				return;
			}
			this.#Validate();
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
		this.#homey.get( id, function( err, value )
		{
			if( err ) return this.#homey.alert( err );
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

			this.#values[id] = value;
		}.bind( this ) );
	}

	#Save( id, type )
	{
		const Target = document.getElementById( id );
		const Value = ( type === 'checkbox' ) ? Target.checked : Target.value;

		if( this.#values[id] === Value )
		{
			return false;
		}

		this.#homey.get( id, function( err, value )
		{
			if( err ) return this.#homey.alert( err );
			if( value === Value ) return;
			this.#homey.set( id, Value, function( err )
			{
				this.#values[id] = Value;
				if( err ) return this.#homey.alert( err );
			}.bind( this ) );
		}.bind( this ) );

		return true;
	}

	#Validate()
	{
		this.#homey.get( 'validation', function( err, value )
		{
			if( err )
			{
				// loop end
				this.#ResetSave();
				this.#SetLocalizedInfo( 'Message.ErrorLogin' );
				console.log( 'error: ' + JSON.stringify( err ) );
				return;
			}

			const Value = Number.parseInt( value );

			// check for wait state -> back to begin
			if( Value === 2 )
			{
				// add delay to save performance
				setTimeout( this.#Validate.bind( this ), 500 );
				return;
			}

			// make sure we re-enable button
			this.#ResetSave();

			// show result to user
			if( Value === 1 )
			{
				this.#SetLocalizedInfo( 'Message.ValidLogin' );
				return;
			}

			this.#homey.get( 'validationInfo', function( err, value )
			{
				console.log( 'validation info: ' + JSON.stringify( value ) );
				if( err )
				{
					console.error( 'error: ' + JSON.stringify( err ) );
				}

				this.#SetLocalizedInfo( value );
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
