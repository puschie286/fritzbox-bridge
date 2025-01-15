export interface FritzboxApiDevice
{
	identifier?: string;
	id: string;
	functionbitmask: string;
	fwversion: string;
	manufacturer: string;
	productname: string;
}

export interface GetDeviceListInfo
{
	devicelist?: {
		version: string;
		fwversion: string; // fritzbox version
		device?: FritzboxApiDevice | FritzboxApiDevice[];
	};
	// TODO: add group
}