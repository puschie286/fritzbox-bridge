import { BaseDriver } from '../../lib/BaseDriver';
import { MaskCheck } from '../../lib/Helper';
import { FritzApiBitmask } from '../../types/FritzApi';
import { ButtonInfo } from '../../types/ButtonInfo';

class Driver extends BaseDriver
{
	GetBaseFunction(): number
	{
		return 0;
	}

	protected async LateSetup( deviceSetup: ParingDevice, device: any ): Promise<void>
	{
		// button preparations
		if( MaskCheck( device.functionbitmask, FritzApiBitmask.Button ) )
		{
			this.SetupButton( deviceSetup, device );
		}
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
