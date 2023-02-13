import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { ButtonInfo } from '../types/ButtonInfo';
import { CapabilityType } from '../types/CapabilityType';
import { FlowCard, FlowCardTriggerDevice } from 'homey';
import Homey from 'homey/lib/Homey';

export class Button extends BaseFeature
{
	private lastButtonTimes: Array<number> = [];
	private singleMode: boolean = false;

	private static multiTrigger: FlowCardTriggerDevice;
	private static singleTrigger: FlowCardTriggerDevice;

	public static RegisterCards( homey: Homey )
	{
		this.singleTrigger = homey.flow.getDeviceTriggerCard( 'button_single_triggered' );
		this.multiTrigger = homey.flow.getDeviceTriggerCard( 'button_triggered' );
		this.multiTrigger.registerArgumentAutocompleteListener( 'name', this.TriggerAutocompletion );
		this.multiTrigger.registerRunListener( this.TriggerValidation );
	}

	private SingleButtonSetup(): Capability
	{
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
			const buttonName: Capability = {
				name: 'button_name_' + index,
				state: 'button.' + index + '.name',
				type: CapabilityType.String,
				valueFunc: value => this.updateName( value, index ),
				hidden: true
			}

			buttons.push( buttonLastTrigger );
			buttons.push( buttonName );
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

	private static TriggerAutocompletion( query: any, args: any ): FlowCard.ArgumentAutocompleteResults
	{
		const buttons: Array<ButtonInfo> = args.device.getStoreValue( 'buttonConfig' );

		return buttons.filter( ( entry ) => {
			return entry.name.toLowerCase().includes( query.toLowerCase() );
		} );
	}

	private static TriggerValidation( args: any, state: ButtonInfo )
	{
		return args.name.id === state.id;
	}

	private updateName( value: string, index: number )
	{
		const buttons: Array<ButtonInfo> = this.device.getStoreValue( 'buttonConfig' );
		const oldName = buttons[index].name;

		if( oldName === value )
		{
			return;
		}

		buttons[index].name = value;

		return this.device.setStoreValue( 'buttonConfig', buttons );
	}

	private async buttonTime( value: number | null, index: number )
	{
		const lastValue = this.lastButtonTimes[index];
		const newValue = value ?? 0;

		// initial value set
		if( lastValue === -1 )
		{
			this.lastButtonTimes[index] = newValue;
			return;
		}

		// no change
		if( lastValue === newValue )
		{
			return;
		}

		// triggered
		this.lastButtonTimes[index] = newValue;
		return this.ButtonTrigger( index );
	}

	private async ButtonTrigger( index: number )
	{
		if( this.singleMode )
		{
			return Button.singleTrigger.trigger( this.device );
		}

		const Info: ButtonInfo = this.device.getStoreValue( 'buttonConfig' )[index];
		return Button.multiTrigger.trigger( this.device, undefined, Info );
	}
}
