import { Device } from "homey";

export interface CapabilityListener
{
	[name: string]: Device.CapabilityCallback
}
