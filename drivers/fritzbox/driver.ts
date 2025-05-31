import { BaseDriver } from '../../lib/BaseDriver';
import { HandleHttpError } from "../../lib/Helper";

// TODO: support multiple fritzbox router
class Driver extends BaseDriver
{
	public GetBaseFunction(): number
	{
		return -1;
	}

	protected override async GetDeviceList(): Promise<Array<ParingDevice>>
	{
		try
		{
			// ensure fritzbox is reachable
			await this.fritzbox.GetApi().getFritzboxOverview();
			return [
				{
					name: 'Fritzbox',
					data: {
						id: 'fritzbox',
						time: undefined
					},
					store: {},
					settings: {}
				}
			];
		}
		catch( error: any )
		{
			throw Error( this.homey.__( HandleHttpError( error ) || 'Message.SendFailed' ) );
		}
	}
}

module.exports = Driver;
