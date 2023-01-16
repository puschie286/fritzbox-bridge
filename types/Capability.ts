import { CapabilityType } from "./CapabilityType";
import { CapabilityOption } from "./CapabilityOption";

export interface Capability
{
	readonly state: string,
	readonly type: CapabilityType,
	readonly valueFunc?: ( value: any ) => Promise<any>|any,
	readonly option?: CapabilityOption
}

export const Availability = 'availability';
