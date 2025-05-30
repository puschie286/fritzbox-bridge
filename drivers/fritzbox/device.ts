import { BaseDevice } from '../../lib/BaseDevice';
import { Fritzbox } from '../../features/Fritzbox';

export class Device extends BaseDevice
{
	protected async Initialize( dataFunctions?: number ): Promise<void>
	{
		if( this.initialized )
		{
			return;
		}

		this.features = [ new Fritzbox( this ) ];
		await this.features[0].LateInit();

		await this.UpdateCapabilities();
		this.UpdateListeners();

		this.initialized = true;
	}
}

module.exports = Device;
