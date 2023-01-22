import { BaseDriver } from "../../lib/BaseDriver";
import { FritzApiBitmask } from "../../types/FritzApi";

class Driver extends BaseDriver
{
	GetBaseFunction(): number
	{
		return FritzApiBitmask.BlindControl;
	}
}

module.exports = Driver;
