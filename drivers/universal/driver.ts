import { BaseDriver } from '../../lib/BaseDriver';
import { MaskCheck } from '../../lib/Helper';
import { FritzApiBitmask, HanFunTypes } from '../../types/FritzApi';
import { ButtonInfo } from '../../types/ButtonInfo';

class Driver extends BaseDriver
{
	GetBaseFunction(): number
	{
		return 0;
	}

	protected async LateSetup( deviceSetup: ParingDevice, device: any ): Promise<void>
	{
		// han-fun fixes
		if( device.productname === 'HAN-FUN' )
		{
			this.HanFunFixer( deviceSetup, device );
		}

		// button preparations
		if( MaskCheck( device.functionbitmask, FritzApiBitmask.Button ) )
		{
			this.SetupButton( deviceSetup, device );
		}
	}

	private HanFunFixer( deviceSetup: ParingDevice, device: any )
	{
		const unitType = parseInt( device.etsiunitinfo.unittype );
		let functionBitMask = device.functionbitmask;

		// set "normal" bits for han-fun types
		switch( unitType )
		{
			case HanFunTypes.SimpleButton:
				functionBitMask |= FritzApiBitmask.Button;
				break;
		}

		// override mask
		device.functionbitmask = functionBitMask;
		( deviceSetup.store as any ).functions = functionBitMask;
	}

	private SetupButton( deviceSetup: ParingDevice, device: any )
	{
		if( !Array.isArray( device.button ) )
		{
			return;
		}

		let buttonInfo: Array<ButtonInfo> = [];
		for( const button of device.button )
		{
			const info: ButtonInfo = {
				name: button.name, id: button.identifier
			}
			buttonInfo.push( info );
		}

		( deviceSetup.store as any ).buttonConfig = buttonInfo;
	}
}

module.exports = Driver;
