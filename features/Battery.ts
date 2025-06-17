import { BaseFeature } from "../lib/BaseFeature";
import { Capability } from "../types/Capability";
import { CapabilityType } from "../types/CapabilityType";

export class Battery extends BaseFeature
{
	public override async LateInit(): Promise<void>
	{
		await super.LateInit();

		await this.EnsureEnergyConfig( { batteries: [ "AA", "AA" ] } );
	}

	private async EnsureEnergyConfig( targetConfig: object ): Promise<void>
	{
		const currentConfig = this.device.getEnergy();

		// done if config is identical
		if( JSON.stringify( targetConfig ) === JSON.stringify( currentConfig ) )
		{
			return;
		}

		console.log( `change energy config: ${JSON.stringify( currentConfig )} -> ${JSON.stringify( targetConfig )}` );

		// update energy config
		try
		{
			await this.device.setEnergy( targetConfig );
		}
		catch( e )
		{
			console.error( 'failed to set energy config -> skip' );
			console.error( e );
		}
	}

	protected Capabilities(): Array<Capability>
	{
		return [
			{
				name: 'measure_battery', state: 'battery', type: CapabilityType.Integer
			}, {
				name: 'measure_battery_low', state: 'batterylow', type: CapabilityType.Boolean
			}
		];
	}
}