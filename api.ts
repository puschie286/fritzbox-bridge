import { FritzboxManager } from './lib/FritzboxManager';
import { ApiParameter } from './types/ApiParameter';

module.exports = {

	async getDevices( params: ApiParameter )
	{
		const manager = FritzboxManager.GetSingleton();
		const api = manager.GetApi();

		const data = await api.getDeviceList();

		if( ShouldDataBeUploaded( params ) )
		{
			console.log( JSON.stringify( data ) );
			/*if( !await manager.LogMessageOnline( JSON.stringify( data ) ) )
			{
				return 'failed';
			}*/
		}

		return data;
	},

	async getNetworkDevices( params: ApiParameter )
	{
		const manager = FritzboxManager.GetSingleton();
		const api = manager.GetApi();

		// @ts-ignore
		const data = ( await api.getFritzboxNetwork() )['data']['active'];

		if( ShouldDataBeUploaded( params ) )
		{
			console.log( JSON.stringify( data ) );
			/*if( !await manager.LogMessageOnline( JSON.stringify( data ) ) )
			{
				return 'failed';
			}*/
		}

		return data;
	}
}

function ShouldDataBeUploaded( params: ApiParameter ): boolean
{
	// @ts-ignore
	return params.query.upload !== undefined && params.query.upload === 'true';
}
