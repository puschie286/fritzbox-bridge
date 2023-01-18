import { FritzboxManager } from "./lib/FritzboxManager";
import { ApiParameter } from "./types/ApiParameter";

module.exports = {

	async getDevices( params: ApiParameter )
	{
		const api = FritzboxManager.GetSingleton().GetApi();

		return await api.getDeviceList();
	},

	async getNetworkDevices( params: ApiParameter )
	{
		const api = FritzboxManager.GetSingleton().GetApi();

		// @ts-ignore
		const data = ( await api.getFritzboxNetwork() )['data'];

		return data['active'];
	}
}
