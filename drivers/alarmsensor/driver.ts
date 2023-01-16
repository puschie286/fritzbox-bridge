import { FritzApiBitmask } from "../../types/FritzApi";
import { BaseDriver } from "../../lib/BaseDriver";

class Driver extends BaseDriver
{
	GetFunctionMask(): number
	{
		return FritzApiBitmask.Alarm;
	}
}

module.exports = Driver;
