import { BaseDriver } from "../../lib/BaseDriver";
import { FritzApiBitmask } from "../../types/FritzApi";

class Driver extends BaseDriver
{
	GetFunctionMask(): number
	{
		return FritzApiBitmask.BlindControl;
	}
}

module.exports = Driver;
