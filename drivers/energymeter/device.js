'use strict';

const BaseDevice = require('../../lib/baseDevice');

class EnergymeterDevice extends BaseDevice
{
	Init( deviceData )
	{
		this.POWER  = 'powermeter.power';
		this.VOLTAGE= 'powermeter.voltage';
		this.ENERGY = 'powermeter.energy';

		if( deviceData === null ) return;
		this.UpdateProperty( this.POWER, deviceData[this.POWER] );
		this.UpdateProperty( this.VOLTAGE, deviceData[this.VOLTAGE] );
		this.UpdateProperty( this.ENERGY, deviceData[this.ENERGY] );
	}

	UpdateProperty( key, value )
	{
		switch( key )
		{
			case this.POWER:
				this.updateCapabilityNumber( value / 1000, 'measure_power' );
				break;

			case this.ENERGY:
				this.updateCapabilityNumber( value / 1000, 'meter_power' );
				break;

			case this.VOLTAGE:
				this.updateCapabilityNumber( value / 100000, 'measure_voltage' );
				break;
		}
	}

}

module.exports = EnergymeterDevice;