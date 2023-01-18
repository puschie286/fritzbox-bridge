import Homey from "homey/lib/Homey";
import { FritzboxDevice } from "../types/FritzboxDevice";
import { FlowCardTrigger } from "homey";

export class FritzboxTracker
{
	private FirstCheck: boolean = true;
	private DeviceList: Map<string, FritzboxDevice> = new Map<string, FritzboxDevice>();
	private ConnectedTrigger: FlowCardTrigger;
	private DisconnectTrigger: FlowCardTrigger;

	// old triggers
	private wlanConnectTrigger: FlowCardTrigger;
	private wlanDisconnectTrigger: FlowCardTrigger;

	private readonly homey: Homey;

	public constructor( homey: Homey )
	{
		this.homey = homey;

		this.ConnectedTrigger = this.homey.flow.getTriggerCard( 'network_device_connected' );
		this.DisconnectTrigger = this.homey.flow.getTriggerCard( 'network_device_disconnected' );

		this.wlanConnectTrigger = this.homey.flow.getTriggerCard( 'wlan_device_connected' );
		this.wlanDisconnectTrigger = this.homey.flow.getTriggerCard( 'wlan_device_disconnected' );
	}

	private UpdateDeviceList( deviceList: Array<FritzboxDevice> )
	{
		if( deviceList.length === 0 )
		{
			return;
		}

		for( const device of deviceList )
		{
			this.DeviceList.set( device.mac, device );
		}
	}

	private CreateDeviceToken( device: FritzboxDevice ): object
	{
		return {
			'device_name': device.name,
			'device_ip': device.ipv4.ip,
			'device_mac': device.mac,
			'device_connection_type': device.type
		};
	}

	public async UpdateDevices( network: any )
	{
		const devicesList: Array<FritzboxDevice> = network['data']['active'];

		if( this.FirstCheck )
		{
			this.UpdateDeviceList( devicesList );
			this.FirstCheck = false;
			return;
		}

		// determine add
		let newDevices: Array<FritzboxDevice> = [];
		let newMacList: Array<string> = [];
		for( const device of devicesList )
		{
			const mac: string = device.mac;
			if( !this.DeviceList.has( mac ) )
			{
				newDevices.push( device );
			}

			newMacList.push( mac );
		}
		// determine remove
		let removedDevices: Array<FritzboxDevice> = [];
		const keys = Array.from( this.DeviceList.keys() );
		for( const key of keys )
		{
			if( newMacList.includes( key ) )
			{
				continue;
			}

			removedDevices.push( this.DeviceList.get( key )! );
			this.DeviceList.delete( key );
		}

		for( const device of newDevices )
		{
			await this.ConnectedTrigger.trigger( this.CreateDeviceToken( device ) );

			await this.wlanConnectTrigger.trigger( { 'device_name': device.name } );
		}
		for( const device of removedDevices )
		{
			await this.DisconnectTrigger.trigger( this.CreateDeviceToken( device ) );

			await this.wlanDisconnectTrigger.trigger( { 'device_name': device.name } );
		}

		this.UpdateDeviceList( devicesList );
	}
}
