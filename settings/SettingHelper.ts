import {Settings, SettingsDefault} from "../lib/Settings";
import {SettingDefinition} from "../types/SettingDefinition";
import {SettingType} from "../types/SettingType";
import {HomeyWeb} from "../types/HomeyWeb";
import {LoginValidation} from "../types/LoginValidation";

class SettingHelper
{
    // @ts-ignore
	private static homey: HomeyWeb;

    public static async Init( homey: HomeyWeb )
    {
		this.homey = homey;

        this.InitSettings( 'save', [
            { id: Settings.USERNAME, default: SettingsDefault.USERNAME },
            { id: Settings.PASSWORD, default: SettingsDefault.PASSWORD },
            { id: Settings.FRITZBOX_URL, default: SettingsDefault.FRITZBOX_URL },
            { id: Settings.STRICT_SSL, type: SettingType.Checkbox, default: SettingsDefault.STRICT_SSL },
            { id: Settings.POLL_INTERVAL, default: SettingsDefault.POLL_INTERVAL },
            { id: Settings.POLL_ACTIVE, type: SettingType.Checkbox, default: SettingsDefault.POLL_ACTIVE },
            { id: Settings.STATUS_INTERVAL, default: SettingsDefault.STATUS_INTERVAL },
            { id: Settings.STATUS_ACTIVE, default: SettingsDefault.STATUS_ACTIVE },
            { id: Settings.SHOW_UNCONNECTED, type: SettingType.Checkbox, default: SettingsDefault.SHOW_UNCONNECTED },
        ] );

        await homey.ready();
    }

    private static InitSettings( saveId: string, settings: Array<SettingDefinition> )
    {
        const target = document.getElementById( saveId );
        if( target === null )
        {
            return this.homey.alert( 'Invalid SaveID' );
        }

        for( const setting of settings )
        {
            this.InitSetting( setting );
        }

		const self = this;
		target.addEventListener( 'click', function()
		{
			for( const setting of settings )
			{
				self.Save( setting );
			}

			self.Validate( saveId );
		} );
    }

    private static InitSetting( setting: SettingDefinition )
    {
		const self = this;
		this.homey.get( setting.id, function( err: any, value: any )
		{
			if( err )
			{
				self.homey.alert( err );
				return;
			}

			const target = document.getElementById( setting.id );
			// apply default
			if( self.IsEmpty( target ) )
			{
				value = setting.default;
			}

			if( setting.type === SettingType.Checkbox )
			{
				// @ts-ignore
				target.checked = Boolean( value );
			}
			else
			{
				// @ts-ignore
				target.value = value;
			}
		} );
    }

	private static Save( setting: SettingDefinition )
	{
		const target = document.getElementById( setting.id );
		// @ts-ignore
		const value = setting.type === SettingType.Checkbox ? target.checked : target.value;

		const self = this;
		this.homey.set( setting.id, value, function( err: any )
		{
			if( err )
			{
				self.homey.alert( err );
			}
		} );
	}

	private static Validate( saveId: string )
	{
		const target = document.getElementById( saveId );
		// @ts-ignore
		target.disabled = true;

		const self = this;
		this.homey.get( Settings.VALIDATION, function( err: any, value: any )
		{
			if( err )
			{
				// @ts-ignore
				target.disabled = false;
				const errorText = self.homey.__( 'Message.ErrorLogin' );
				self.homey.alert( errorText );
				console.log( 'error: ' + err );
				return;
			}

			const result: number = Number.parseInt( value );

			// check for wait state -> back to begin
			if( result === LoginValidation.Progress )
			{
				// add delay to save performance
				setTimeout( () => self.Validate( saveId ), 500 );
				return;
			}

			// make sure we re-enable button
			// @ts-ignore
			target.disabled = false;

			if( result === LoginValidation.Valid )
			{
				const resultText = self.homey.__( 'Message.ValidLogin' );
				self.homey.alert( resultText );
			}
			else
			{
				self.homey.get( Settings.VALIDATION_INFO, function( err: any, value: any )
				{
					const resultText = self.homey.__( 'Message.InvalidLogin' );
					self.homey.alert( resultText );
					if( err )
					{
						console.log( err );
						return;
					}
					self.homey.alert( value );
				} );
			}
		} );
	}

	private static IsEmpty( value: any ): boolean
	{
		return value === null || value === undefined;
	}
}
