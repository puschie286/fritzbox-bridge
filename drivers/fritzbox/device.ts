import { BaseDevice } from "../../lib/BaseDevice";
import { CapabilityDefinition } from "../../types/CapabilityDefinition";
import { CapabilityType } from "../../types/CapabilityType";
import { FlowCardTrigger } from "homey";

class Device extends BaseDevice
{
	private FirstCheck: boolean = true;
	private DeviceList: Array<string> = [];

	private ConnectedTrigger?: FlowCardTrigger;
	private DisconnectTrigger?: FlowCardTrigger;

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
		this.ConnectedTrigger = this.homey.flow.getTriggerCard( 'wlan_device_connected' );
		this.DisconnectTrigger = this.homey.flow.getTriggerCard( 'wlan_device_disconnected' );
	}

	public async Update( data: any )
	{
		await super.Update( data );

		// check for device change
		await this.checkDevices( data );
	}

	protected async checkDevices( data: any )
	{
		const devicesList = data['data']['net']['devices'];

		let connectedDevices: string[] = [];
		for( const device of devicesList )
		{
			connectedDevices.push( device['name'] );
		}

		if( this.FirstCheck )
		{
			this.DeviceList = connectedDevices;
			this.FirstCheck = false;
			return;
		}

		let removedDevices = this.DeviceList.filter( device => !connectedDevices.includes( device ) );
		let newDevices = connectedDevices.filter( device => !this.DeviceList.includes( device ) );

		for( const device of newDevices )
		{
			const token = {
				'device_name': device
			}
			await this.ConnectedTrigger!.trigger( token );
		}
		for( const device of removedDevices )
		{
			const token = {
				'device_name': device
			}
			await this.DisconnectTrigger!.trigger( token );
		}

		this.DeviceList = connectedDevices;
	}
}

module.exports = Device;
