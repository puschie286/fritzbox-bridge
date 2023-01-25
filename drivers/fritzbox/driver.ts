import { BaseDriver } from '../../lib/BaseDriver';

// TODO: support multiple fritzbox router
class Driver extends BaseDriver
{
	public GetBaseFunction(): number
	{
		return -1;
	}

	protected async GetDeviceList(): Promise<Array<ParingDevice>>
	{
		console.debug( 'request device list for: fritzbox' );

		const data = await this.fritzbox.GetApi().getFritzboxOverview();

		if( data.length === 0 )
		{
			return [];
		}

		return [ {
			name: 'Fritzbox', data: {
				id: 'fritzbox'
			}, store: {}, settings: {}
		} ];
	}
}

module.exports = Driver;
