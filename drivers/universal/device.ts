import { BaseDevice } from '../../lib/BaseDevice';
import { MaskCheck } from '../../lib/Helper';
import { FritzApiBitmask } from '../../types/FritzApi';

class Device extends BaseDevice
{
	async onAdded()
	{
		super.onAdded();

		await this.DetermineClass();
	}

	private async DetermineClass()
	{
		// determine initial class
		let classType = 'other';
		const functionMask = this.getStoreValue( 'functions' ) ?? 0;
		if( MaskCheck( functionMask, FritzApiBitmask.Thermostat ) )
		{
			classType = 'thermostat';
		}
		else if( MaskCheck( functionMask, FritzApiBitmask.BlindControl ) )
		{
			classType = 'blinds';
		}
		else if( MaskCheck( functionMask, FritzApiBitmask.Outlet ) )
		{
			classType = 'socket';
		}
		else if( MaskCheck( functionMask, FritzApiBitmask.Button ) )
		{
			classType = 'button';
		}
		else if( MaskCheck( functionMask, FritzApiBitmask.EnergyMeter ) || MaskCheck( functionMask, FritzApiBitmask.TemperatureSensor ) || MaskCheck( functionMask, FritzApiBitmask.HumiditySensor ) )
		{
			classType = 'sensor';
		}

		await this.setSettings( {
			device_class: classType
		} );

		await this.setClass( classType );
	}

	async onSettings( {
		oldSettings, newSettings, changedKeys
	}: {
		oldSettings: { [key: string]: boolean | string | number | undefined | null };
		newSettings: { [key: string]: boolean | string | number | undefined | null };
		changedKeys: string[]
	} ): Promise<string | void>
	{
		// device class
		if( changedKeys.includes( 'device_class' ) )
		{
			const classType = newSettings.device_class as string;

			await this.setClass( classType );

			// only one changed ?
			if( changedKeys.length === 1 )
			{
				return;
			}
		}

		return super.onSettings( {
			oldSettings, newSettings, changedKeys
		} );
	}
}

module.exports = Device;
