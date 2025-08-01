import { BaseDriver } from '../../lib/BaseDriver';
import { MaskCheck } from '../../lib/Helper';
import { FritzApiBitmask, HanFunTypes } from '../../types/FritzApi';
import { ButtonInfo } from '../../types/ButtonInfo';
import { Settings, SettingsDefault } from "../../lib/Settings";

class Driver extends BaseDriver
{
	public GetBaseFunction(): number
	{
		return 0;
	}

	public override async onPairListDevices(): Promise<Array<any>>
	{
		// test login first (prevent incorrect error messages)
		if( !this.isLoginValid() )
		{
			throw new Error( this.homey.__( 'Message.FixLogin' ) );
		}

		if( !this.isDectSupported() )
		{
			throw new Error( this.homey.__( 'Message.DECTNotSupported' ) );
		}

		if( !this.skipDectCheck() && !this.isDectEnabled() )
		{
			throw new Error( this.homey.__( 'Message.DECTDisabled' ) );
		}
		
		return super.onPairListDevices();
	}

	protected override async LateSetup( deviceSetup: ParingDevice, device: any ): Promise<void>
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
		if( device.etsiunitinfo === undefined )
		{
			return;
		}

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

	protected skipDectCheck(): boolean
	{
		return ( this.homey.settings.get( Settings.SKIP_DECT_CHECK ) ?? SettingsDefault.SKIP_DECT_CHECK ) === true;
	}

	protected isDectEnabled(): boolean
	{
		return this.homey.settings.get( Settings.DECT_ENABLED ) === true;
	}

	protected isDectSupported(): boolean
	{
		return this.homey.settings.get( Settings.DECT_SUPPORT ) === true;
	}
}

module.exports = Driver;
