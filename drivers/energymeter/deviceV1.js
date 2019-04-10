'use strict';

const BaseDevice = require('../../lib/baseDevice');

class EnergymeterV1 extends BaseDevice
{
	ValueCapabilityAssignment()
	{
		return {
			'availability': [ 'present', 'boolean' ],
			'measure_power': [ 'powermeter.power', 'number', ( A ) => A / 1000 ],
			'meter_power': [ 'powermeter.energy', 'number', ( A ) => A / 1000 ],
			'measure_voltage': [ 'powermeter.voltage', 'number', ( A ) => A / 1000 ],
		}
	}

	UpdateProperty( name, value, type, valueFunc )
	{
		// calculate measure_current with power, energy, voltage
		if( name !== 'availability' )
		{
			// get all needed values | new value if possible
			let Power = name === 'measure_pwer' ? valueFunc( value ) : this.getCapabilityValue( 'measure_power' );
			let Voltage = name === 'measure_voltage' ? valueFunc( value ) : this.getCapabilityValue( 'measure_voltage' );

			// calc final value and round to 4 digits
			let current = Number( Power / Voltage ).toFixed( 4 );
			if( current !== this.getCapabilityValue( 'measure_current' ) )
			{
				this.setCapabilityValue( 'measure_current', current );
			}

			// skip because we emulate capability and dont use default implementation
			if( name === 'measure_current' ) return;
		}

		super.UpdateProperty( name, value, type, valueFunc );
	}
}

module.exports = EnergymeterV1;