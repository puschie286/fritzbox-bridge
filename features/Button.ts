import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { ButtonInfo } from '../types/ButtonInfo';
import { CapabilityType } from '../types/CapabilityType';
import { FlowCard, FlowCardTriggerDevice } from 'homey';

export class Button extends BaseFeature
{
	private lastButtonTimes: Array<number> = [];
	// @ts-ignore
	private buttonTrigger: FlowCardTriggerDevice;
	private singleMode: boolean = false;

	private SingleButtonSetup(): Capability
	{
		this.buttonTrigger = this.device.homey.flow.getDeviceTriggerCard( 'button_single_triggered' );
		this.lastButtonTimes.push( -1 );

		return {
			name: 'button.single',
			state: 'button.lastpressedtimestamp',
			type: CapabilityType.Integer,
			valueFunc: value => this.buttonTime( value, 0 ),
			options: {
				uiComponent: null,
				uiQuickAction: false
			}
		};
	}

	private MultiButtonSetup( buttonSetup: Array<ButtonInfo> ): Array<Capability>
	{
		this.buttonTrigger = this.device.homey.flow.getDeviceTriggerCard( 'button_triggered' );
		this.buttonTrigger.registerArgumentAutocompleteListener( 'name', this.TriggerAutocompletion.bind( this ) );
		this.buttonTrigger.registerRunListener( this.TriggerValidation );

		let buttons: Array<Capability> = [];
		for( let index = 0; index < buttonSetup.length; index++ )
		{
			const buttonLastTrigger: Capability = {
				name: 'button.' + index,
				state: 'button.' + index + '.lastpressedtimestamp',
				type: CapabilityType.Integer,
				valueFunc: value => this.buttonTime( value, index ),
				options: {
					uiComponent: null,
					uiQuickAction: false
				}
			};

			buttons.push( buttonLastTrigger )
			this.lastButtonTimes.push( -1 );
		}

		return buttons;
	}

	protected Capabilities(): Array<Capability>
	{
		const buttonSetup: Array<ButtonInfo>|null = this.device.getStoreValue( 'buttonConfig' );
		this.singleMode = buttonSetup === null;

		// single mode
		if( buttonSetup === null )
		{
			return [ this.SingleButtonSetup() ];
		}

		// multi mode
		return this.MultiButtonSetup( buttonSetup );
	}

	private TriggerAutocompletion( query: any ): FlowCard.ArgumentAutocompleteResults
	{
		const buttons: Array<ButtonInfo> = this.device.getStoreValue( 'buttonConfig' );

		return buttons.filter( ( entry ) => {
			return entry.name.toLowerCase().includes( query.toLowerCase() );
		} );
	}

	private TriggerValidation( args: any, state: ButtonInfo )
	{
		return args.name.name === state.name;
	}

	private async buttonTime( value: number | null, index: number )
	{
		const lastValue = this.lastButtonTimes[index];

		// initial value set
		if( lastValue === -1 )
		{
			this.lastButtonTimes[index] = value ?? 0;
			return;
		}

		// no change
		if( value === null || lastValue === value  )
		{
			return;
		}

		// triggered
		this.lastButtonTimes[index] = value;
		return this.ButtonTrigger( index );
	}

	private async ButtonTrigger( index: number )
	{
		if( this.singleMode )
		{
			return this.buttonTrigger.trigger( this.device );
		}

		const Info: ButtonInfo = this.device.getStoreValue( 'buttonConfig' )[index];
		return this.buttonTrigger.trigger( this.device, undefined, Info );
	}
}
