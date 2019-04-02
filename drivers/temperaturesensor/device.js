'use strict';

const BaseDevice = require('../../lib/baseDevice');

class TemperatureDevice extends BaseDevice
{
	Init( deviceData )
	{
		this.CELSIUS    = 'temperature.celsius';
		this.OFFSET     = 'temperature.offset';

		let Data = deviceData.temperature;
		this.UpdateProperty( this.CELSIUS, Data.celsius );
		this.UpdateProperty( this.OFFSET, Data.offset );
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

module.exports = TemperatureDevice;