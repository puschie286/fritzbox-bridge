import { BaseDriver } from '../../lib/BaseDriver';
import { FritzboxBitmask } from '../../types/FritzboxTypes';

class Driver extends BaseDriver
{
	GetBaseFunction(): number
	{
		return FritzboxBitmask.EnergyMeter;
	}
}

module.exports = Driver;
