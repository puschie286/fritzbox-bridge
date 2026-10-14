import { BaseDevice } from '../../lib/BaseDevice';
import { Fritzbox } from '../../features/Fritzbox';

export class Device extends BaseDevice
{
	public override async Update( data: any, isCurrent: () => boolean = () => true ): Promise<void>
	{
		await super.Update( data, isCurrent );
		if( data !== null && isCurrent() && !this.getAvailable() ) await this.setAvailable();
	}

	protected override async Initialize( dataFunctions?: number ): Promise<void>
	{
		if( this.initialized )
		{
			return;
		}

		this.features = [ new Fritzbox( this ) ];

		await this.UpdateCapabilities();
		this.UpdateListeners();

		await this.features[0].LateInit();

		this.initialized = true;
	}
}

module.exports = Device;
