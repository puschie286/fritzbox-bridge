'use strict';

const BaseDevice = require('../../lib/baseDevice');

class EnergymeterDevice extends BaseDevice
{
	Init( deviceData )
	{
		this.POWER  = 'powermeter.power';
		this.VOLTAGE= 'powermeter.voltage';
		this.ENERGY = 'powermeter.energy';

		let Data = deviceData.powermeter;
		this.UpdateProperty( this.POWER, Data.voltage );
		this.UpdateProperty( this.VOLTAGE, Data.power );
		this.UpdateProperty( this.ENERGY, Data.energy );
	}

	UpdateProperty( key, value )
	{
		switch( key )
		{
			case this.POWER:
				this.updateCapabilityNumber( value, 'measure_power' );
				break;

			case this.ENERGY:
				this.updateCapabilityNumber( value, 'meter_power' );
				break;

			case this.VOLTAGE:
				this.updateCapabilityNumber( value, 'measure_current' );
				break;
		}
	}

}

module.exports = EnergymeterDevice;