'use strict';

const BaseDevice = require('../../lib/baseDevice');

class AlarmsensorDevice extends BaseDevice {
	
	Init( deviceData )
	{
		this.ALARM = 'alert.state';

		this.UpdateProperty( this.ALARM, deviceData[this.ALARM] );
	}

	UpdateProperty( key, value )
	{
		switch( key )
		{
			case this.ALARM:
				this.updateCapabilityBoolean( value, 'alarm_generic' );
				break;
		}
	}
}

module.exports = AlarmsensorDevice;