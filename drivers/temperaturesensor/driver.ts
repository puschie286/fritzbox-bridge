import { BaseDriver } from "../../lib/BaseDriver";
import { FritzApiBitmask } from "../../types/FritzApi";

class Driver extends BaseDriver
{
	GetFunctionMask(): number
	{
		return FritzApiBitmask.TemperatureSensor;
	}
}

module.exports = Driver;
