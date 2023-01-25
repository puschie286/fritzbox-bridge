import { CapabilityType } from './CapabilityType';

export interface Capability
{
	readonly name: string,
	readonly state?: string,
	readonly type?: CapabilityType,
	readonly valueFunc?: ( value: any ) => Promise<any> | any,
	readonly hidden?: boolean,
	readonly options?: object,
}
