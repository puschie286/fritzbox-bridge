'use strict';

const BaseDevice = require('../../lib/baseDevice');

class TemperaturesensorDevice extends BaseDevice
{
	Init( deviceData )
	{
		this.CELSIUS    = 'temperature.celsius';
		this.OFFSET     = 'temperature.offset';

		if( deviceData === null ) return;
		this.UpdateProperty( this.CELSIUS, deviceData[this.CELSIUS] );
		this.UpdateProperty( this.OFFSET, deviceData[this.OFFSET] );
	}

	UpdateProperty( key, value )
	{
		switch( key )
		{
			case this.CELSIUS:
				this.updateCapabilityNumber( value, 'measure_temperature', 0.1 );
				break;

			case this.OFFSET:
				this.updateCapabilityNumber( value, 'measure_temperature.offset', 0.1 );
				break;
		}
	}
}

module.exports = TemperaturesensorDevice;