import { FritzboxManager } from "./lib/FritzboxManager";
import { ApiParameter } from "./types/ApiParameter";

module.exports = {

	async getDevices( params: ApiParameter )
	{
		const api = FritzboxManager.GetSingleton().GetApi();

		const data = await api.getDeviceList();

		if( ShouldDataBeUploaded( params ) )
		{
			const result = FritzboxManager.GetSingleton().GetLog().captureMessage( JSON.stringify( data ) );

			if( result === undefined )
			{
				return 'failed';
			}

			return await result;
		}

		return data;
	},

	async getNetworkDevices( params: ApiParameter )
	{
		const api = FritzboxManager.GetSingleton().GetApi();

		// @ts-ignore
		const data = ( await api.getFritzboxNetwork() )['data']['active'];

		if( ShouldDataBeUploaded( params ) )
		{
			return FritzboxManager.GetSingleton().GetLog().captureMessage( JSON.stringify( data ) );
		}

		return data;
	}
}

function ShouldDataBeUploaded( params: ApiParameter ): boolean
{
	// @ts-ignore
	return params.query.upload !== undefined && params.query.upload === true;
}
