import { BaseDevice } from '../../lib/BaseDevice';
import { MaskCheck } from '../../lib/Helper';
import { FritzboxBitmask } from '../../types/FritzboxTypes';

class Device extends BaseDevice
{
	public override async onAdded()
	{
		super.onAdded();

		await this.DetermineClass();
	}

	private async DetermineClass()
	{
		// determine initial class
		let classType = 'other';
		const functionMask = this.getStoreValue( 'functions' ) ?? 0;
		if( MaskCheck( functionMask, FritzboxBitmask.Thermostat ) )
		{
			classType = 'thermostat';
		}
		else if( MaskCheck( functionMask, FritzboxBitmask.BlindControl ) )
		{
			classType = 'blinds';
		}
		else if( MaskCheck( functionMask, FritzboxBitmask.Outlet ) )
		{
			classType = 'socket';
		}
		else if( MaskCheck( functionMask, FritzboxBitmask.Button ) )
		{
			classType = 'button';
		}
		else if( MaskCheck( functionMask, FritzboxBitmask.EnergyMeter ) || MaskCheck( functionMask, FritzboxBitmask.TemperatureSensor ) || MaskCheck( functionMask, FritzboxBitmask.HumiditySensor ) )
		{
			classType = 'sensor';
		}

		await this.setSettings( {
			device_class: classType
		} );

		await this.setClass( classType );
	}

	public override async onSettings( {
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
