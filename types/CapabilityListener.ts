import { Device } from "homey";

export interface CapabilityListener
{
	name: string,
	callback: Device.CapabilityCallback,
}
