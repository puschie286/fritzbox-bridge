'use strict';

const API = require('../../lib/fritzAPI');
const BaseDriver = require( '../../lib/baseDriver' );

const EnergymeterV0 = require( './deviceV0' );
const EnergymeterV1 = require( './deviceV1' );

class EnergymeterDriver extends BaseDriver {
	
	GetFunctionmask()
	{
		return API.CONST_ENERGYMETER;
	}

	GetDeviceClass( version )
	{
		switch( version )
		{
			case 0:
				return EnergymeterV0;

			case 1:
				return EnergymeterV1;
		}
		return EnergymeterV0;
	}

	GetVersion()
	{
		return 1;
	}
}

module.exports = EnergymeterDriver;