'use strict';

const Homey = require('homey');
const LOG = require('../../lib/logWrapper' );

const BaseDevice = require('../../lib/baseDevice');

class FritzboxDevice extends BaseDevice
{
	ValueCapabilityAssignment()
	{
		return {
			'os_version': [ 'data.fritzos.nspver', 'string' ],
			'alert_update_available': [ 'data.fritzos.isUpdateAvail', 'boolean' ],
			'power_usage': [ 'data.fritzos.energy', 'integer' ]
		};
	}

	CanAddCapability( name )
	{
		return name === 'power_usage';
	}

	onInit()
	{
		super.onInit();

		// list of registered devices
		this.deviceList = [];
		this.firstCheck = true;

		// register trigger
		this.triggerConnected = new Homey.FlowCardTrigger( 'wlan_device_connected' ).register();
		this.triggerDisconnected = new Homey.FlowCardTrigger( 'wlan_device_disconnected' ).register();
	}

	onUpdate( device )
	{
		super.onUpdate( device );

		// check for device change
		this.checkDevices( device );
	}

	checkDevices( data )
	{
		const devicesList = data['data']['net']['devices'];

		let connectedDevices = [];
		devicesList.forEach( device => {
			connectedDevices.push( device['name'] );
		});

		if( this.firstCheck )
		{
			this.deviceList = connectedDevices;
			this.firstCheck = false;
			return;
		}

		let removedDevices = this.deviceList.filter( device => !connectedDevices.includes( device ) );
		let newDevices = connectedDevices.filter( device => !this.deviceList.includes( device ) );

		newDevices.forEach( device => {
			let token = {
				'device_name': device
			}
			this.triggerConnected.trigger( token ).catch( error => LOG.error( error ) );
		})
		removedDevices.forEach( device => {
			let token = {
				'device_name': device
			}
			this.triggerDisconnected.trigger( token ).catch( error => LOG.error( error ) );
		});

		this.deviceList = connectedDevices;
	}
}

module.exports = FritzboxDevice;
