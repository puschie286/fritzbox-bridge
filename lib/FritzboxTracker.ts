import Homey from 'homey/lib/Homey';
import { FritzboxDevice } from '../types/FritzboxDevice';
import { FlowCard, FlowCardTrigger } from 'homey';
import { FunctionFactory } from './FunctionFactory';
import { FritzboxManager } from "./FritzboxManager";
import { Template } from "../types/Template";
import { Settings } from "./Settings";
import { LoginValidation } from "../types/LoginValidation";

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
	
	private template: Template[] = [];
	private templateLoad: number = 0;

	public constructor( homey: Homey )
	{
		this.homey = homey;

		// global trigger
		this.ConnectedTrigger = this.homey.flow.getTriggerCard( 'network_device_connected' );
		this.DisconnectTrigger = this.homey.flow.getTriggerCard( 'network_device_disconnected' );

		this.wlanConnectTrigger = this.homey.flow.getTriggerCard( 'wlan_device_connected' );
		this.wlanDisconnectTrigger = this.homey.flow.getTriggerCard( 'wlan_device_disconnected' );

		// global conditions
		this.homey.flow.getConditionCard( 'network_device_is_connected_by_ip' ).registerRunListener( this.OnConditionConnectedByIp.bind( this ) );
		this.homey.flow.getConditionCard( 'network_device_is_connected_by_mac' ).registerRunListener( this.OnConditionConnectedByMac.bind( this ) );
		this.homey.flow.getConditionCard( 'network_device_is_connected_by_name' ).registerRunListener( this.OnConditionConnectedByName.bind( this ) );
		
		// global actions
		const templateTrigger = this.homey.flow.getActionCard( 'trigger_template' );
		templateTrigger.registerRunListener( this.OnTemplateTrigger.bind( this ) );
		templateTrigger.registerArgumentAutocompleteListener( 'template', this.OnTemplateTriggerAutocompletion.bind( this ) );

		// temperature
		FunctionFactory.RegisterCards( homey );
	}
	
	private async OnTemplateTrigger( args: any )
	{
		const target = args.template.id;
		if( target == undefined )
		{
			return;
		}
		
		try
		{
			await FritzboxManager.GetSingleton().GetApi().applyTemplate( target );
		}
		catch( e )
		{
			throw new Error( this.homey.__( 'Message.TemplateExecuteFailed') );
		}
	}
	
	private async OnTemplateTriggerAutocompletion( query: any,  args: any ): Promise<FlowCard.ArgumentAutocompleteResults>
	{
		// check if login is valid
		if( this.homey.settings.get( Settings.VALIDATION ) !== LoginValidation.Valid )
		{
			throw new Error( this.homey.__( 'Message.LoginRequired' ) );
		}
		
		// check for expired template data
		const time = Date.now();
		if( time - this.templateLoad > 10_000 )
		{
			this.templateLoad = time;
			
			// empty -> wait for data
			if( this.template.length === 0 )
			{
				this.template = await FritzboxManager.GetSingleton().GetApi().getTemplates();
			}
			// dont wait -> directly show results (ensure responsive)
			else
			{
				FritzboxManager.GetSingleton().GetApi().getTemplates().then( templates => this.template = templates );
			}
		}
		
		return this.template
		.filter( template => template.name.toLowerCase().includes( query.toLowerCase() ) )
		.map( template => ({
			name: template.name,
			id: template.identifier
		} ) );
	}

	private async OnConditionConnectedByIp( args: any )
	{
		const ip = args.ip;

		for( const device of this.DeviceList.values() )
		{
			if( device.ipv4.ip === ip )
			{
				return true;
			}
		}

		return false;
	}

	private async OnConditionConnectedByMac( args: any )
	{
		const mac = args.mac;

		return this.DeviceList.has( mac );
	}

	private async OnConditionConnectedByName( args: any )
	{
		const name = args.name;

		for( const device of this.DeviceList.values() )
		{
			if( device.name === name )
			{
				return true;
			}
		}

		return false;
	}

	public async UpdateDevices( network: any )
	{
		const devicesList: Array<FritzboxDevice> = network['data']['active'];
		if( devicesList === undefined || !Array.isArray( devicesList ) )
		{
			// ignore invalid
			return;
		}

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
			//console.log( 'device connected: ' + device.name + ' with ' + device.mac );
			
			await this.ConnectedTrigger.trigger( this.CreateDeviceToken( device ) );

			await this.wlanConnectTrigger.trigger( { 'device_name': device.name } );
		}
		for( const device of removedDevices )
		{
			//console.log( 'device disconnected: ' + device.name + ' with ' + device.mac );
			
			await this.DisconnectTrigger.trigger( this.CreateDeviceToken( device ) );

			await this.wlanDisconnectTrigger.trigger( { 'device_name': device.name } );
		}

		this.UpdateDeviceList( devicesList );
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
}
