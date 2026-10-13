import { FritzboxBitmask } from '../../types/FritzboxTypes';
import { BaseDriver } from '../../lib/BaseDriver';

class Driver extends BaseDriver
{
	GetBaseFunction(): number
	{
		return FritzboxBitmask.Alarm;
	}
}

module.exports = Driver;
