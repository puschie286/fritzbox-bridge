import { FritzboxManager } from './FritzboxManager';
import { Settings } from './Settings';
import { LoginValidation } from '../types/LoginValidation';
import { Driver } from 'homey';

export abstract class BaseDriver extends Driver
{
	// @ts-ignore
	protected fritzbox: FritzboxManager;

	async onInit()
	{
		this.log( 'loaded driver' );

		this.fritzbox = FritzboxManager.GetSingleton();
	}

	async onPairListDevices(): Promise<Array<any>>
	{
		if( !this.isLoginValid() )
		{
			throw new Error( 'Invalid login - cant request device list' );
		}

		console.debug( 'request device list for: ' + this.id );

		return this.GetDeviceList();
	}

	public abstract GetBaseFunction(): number;

	protected async GetDeviceList(): Promise<Array<ParingDevice>>
	{
		const ShowDisconnected = this.homey.settings.get( Settings.SHOW_UNCONNECTED ) === true;
		const AllowMultiple = this.homey.settings.get( Settings.ALLOW_MULTIPLE_REFERENCES ) === true;

		const list = await this.fritzbox.GetApi().getDeviceList();

		let validDevices: ParingDevice[] = [];

		const time = AllowMultiple ? Date.now() : undefined;

		const devices = this.fritzbox.FilterDevices( list, this.GetBaseFunction() );
		for( const device of devices )
		{
			// check if device is connected
			if( !ShowDisconnected && !Boolean( device.present ) ) continue;

			// base setup
			let validDevice: ParingDevice = {
				name: device.name,
				data: {
					id: device.identifier,
					time: time
				},
				store: {
					functions: device.functionbitmask
				},
				settings: {}
			};

			await this.LateSetup( validDevice, device );

			validDevices.push( validDevice );
		}

		return validDevices;
	}

	protected async LateSetup( deviceSetup: ParingDevice, device: any )
	{

	}

	protected isLoginValid(): boolean
	{
		return this.homey.settings.get( Settings.VALIDATION ) === LoginValidation.Valid;
	}
}
