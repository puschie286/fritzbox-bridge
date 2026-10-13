import { BaseDriver } from '../../lib/BaseDriver';
import { FritzboxBitmask } from '../../types/FritzboxTypes';

class Driver extends BaseDriver
{
	GetBaseFunction(): number
	{
		return FritzboxBitmask.Outlet;
	}
}

module.exports = Driver;
