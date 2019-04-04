'use strict';

const Homey = require( 'homey' );
const API = require('./fritzAPI');
const LOG = require('./logWrapper' );

class BaseDriver extends Homey.Driver
{
	onInit()
	{
		LOG.info( 'load driver: ' + this.GetName() );

		this.Functionmask = this.Init();

		// was functionmask set ?
		if( this.Functionmask === null )
		{
			LOG.error( 'driver init failed ( ' + this.constructor.name +' ) - no functionmask' );
			return;
		}

		this.log( '...completed ( ' + this.Functionmask + ' )' );
	}

	onPairListDevices( data, callback )
	{
		if( this.Functionmask === null ) return;

		LOG.debug( 'request device list for: ' + this.constructor.name );

		API.Get().getDeviceList().then( function( list )
		{
			let Devices = API.FilterDevices( list, this.Functionmask );

			Devices[0].forEach( function( entry )
			{
				// check if device is connected
				if( !Boolean( entry.present ) ) return;

				Devices.push({
					name: entry.name + ' - ' + this.GetName(),
					data: { id: entry.identifier, type: this.Functionmask },
					store: { 'device_data': entry },
				});
			}.bind(this));

			callback( null, Devices );
		}.bind(this));
	}

	// virtual functions
	Init()
	{ return null; }

	GetName()
	{
		return 'Unknown';
	}

	/*Update( deviceList, otherDevices )
	{};*/
}

module.exports = BaseDriver;