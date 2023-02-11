import { BaseFeature } from '../lib/BaseFeature';
import { Capability } from '../types/Capability';
import { ButtonInfo } from '../types/ButtonInfo';
import { CapabilityType } from '../types/CapabilityType';
import { FlowCard, FlowCardTriggerDevice } from 'homey';

export class Button extends BaseFeature
{
	private lastButtonTimes: Array<number> = [];
	private buttons: Array<Capability> = [];
	// @ts-ignore
	private buttonTrigger: FlowCardTriggerDevice;
	private singleMode: boolean = false;

	async LateInit(): Promise<void>
	{
		const buttonSetup: Array<ButtonInfo>|undefined = this.device.getStoreValue( 'buttonConfig' );
		this.singleMode = buttonSetup === undefined;

		// single mode
		if( buttonSetup === undefined )
		{
			this.SingleButtonSetup();
			return;
		}

		// multi mode
		this.MultiButtonSetup( buttonSetup );
	}

	private SingleButtonSetup()
	{
		this.buttonTrigger = this.device.homey.flow.getDeviceTriggerCard( 'button_single_triggered' );

		this.buttons.push( {
			name: 'button_triggered_time',
			state: 'button.lastpressedtimestamp',
			type: CapabilityType.Integer,
			valueFunc: value => this.buttonTime( value, 0 ),
			hidden: true
		} );
	}

	private MultiButtonSetup( buttonSetup: Array<ButtonInfo> )
	{
		this.buttonTrigger = this.device.homey.flow.getDeviceTriggerCard( 'button_triggered' );
		this.buttonTrigger.registerArgumentAutocompleteListener( 'name', this.TriggerAutocompletion.bind( this ) );
		this.buttonTrigger.registerRunListener( this.TriggerValidation.bind( this ) );

		for( let index = 0; index < buttonSetup.length; index++ )
		{
			const buttonLastTrigger: Capability = {
				name: 'button_triggered_time',
				state: 'button.' + index + '.lastpressedtimestamp',
				type: CapabilityType.Integer,
				valueFunc: value => this.buttonTime( value, index ),
				hidden: true
			};

			this.buttons.push( buttonLastTrigger )
			this.lastButtonTimes.push( 0 );
		}
	}

	Capabilities(): Array<Capability>
	{
		return this.buttons;
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
		return args.name === state.name;
	}

	private async buttonTime( value: number | null, index: number )
	{
		if( value === null )
		{
			return;
		}

		// no change
		if( this.lastButtonTimes[index] === value )
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
