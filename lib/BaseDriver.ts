import { FritzboxManager } from "./FritzboxManager";
import { Settings } from "./Settings";
import { LoginValidation } from "../types/LoginValidation";
import { Driver } from "homey";

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

	protected async GetDeviceList(): Promise<Array<ParingDevice>>
	{
		let ShowDisconnected = this.homey.settings.get( Settings.SHOW_UNCONNECTED ) === true;
		let self = this;

		const list = await this.fritzbox.GetApi().getDeviceList();
		const mask = this.GetFunctionMask();

		let DeviceFounded: ParingDevice[] = [];
		this.fritzbox.FilterDevices( list, mask ).forEach( function( entry )
		{
			// check if device is connected
			if( !ShowDisconnected && !Boolean( entry.present ) ) return;

			// base setup
			let Device: ParingDevice = {
				name: entry.name,
				data: {
					id: entry.identifier
				},
				store: {},
				settings: {}
			};

			// apply driver specific setup
			self.PrepareParingDevice( entry, Device );

			DeviceFounded.push( Device );
		} );

		return DeviceFounded;
	}

	protected isLoginValid(): boolean
	{
		return this.homey.settings.get( Settings.VALIDATION ) === LoginValidation.Valid;
	}

	public abstract GetFunctionMask(): number;

	protected PrepareParingDevice( device: any, paringDevice: ParingDevice ): void
	{

	}
}
