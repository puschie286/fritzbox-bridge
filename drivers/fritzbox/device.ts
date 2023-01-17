import { BaseDevice } from "../../lib/BaseDevice";
import { CapabilityDefinition } from "../../types/CapabilityDefinition";
import { CapabilityType } from "../../types/CapabilityType";
import { FlowCardTrigger } from "homey";
import { FritzboxDevice } from "../../types/FritzboxDevice";

export class Device extends BaseDevice
{
	private FirstCheck: boolean = true;
	private DeviceList: Map<string, FritzboxDevice> = new Map<string, FritzboxDevice>();

	// @ts-ignore
	private ConnectedTrigger: FlowCardTrigger;
	// @ts-ignore
	private DisconnectTrigger: FlowCardTrigger;

	protected CapabilityDefinitions(): CapabilityDefinition
	{
		return {
			'os_version': { state: 'data.fritzos.nspver', type: CapabilityType.String },
			'alert_update_available': { state: 'data.fritzos.isUpdateAvail', type: CapabilityType.Boolean },
			'power_usage': { state: 'data.fritzos.energy', type: CapabilityType.Integer }
		};
	}

	protected RegisterTrigger()
	{
		this.ConnectedTrigger = this.homey.flow.getTriggerCard( 'network_device_connected' );
		this.DisconnectTrigger = this.homey.flow.getTriggerCard( 'network_device_disconnected' );
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

			this.DeviceList.delete( key );
			removedDevices.push( this.DeviceList.get( key )! );
		}

		for( const device of newDevices )
		{
			await this.ConnectedTrigger.trigger( this.CreateDeviceToken( device ) );
		}
		for( const device of removedDevices )
		{
			await this.DisconnectTrigger.trigger( this.CreateDeviceToken( device ) );
		}

		this.UpdateDeviceList( devicesList );
	}
}

module.exports = Device;
