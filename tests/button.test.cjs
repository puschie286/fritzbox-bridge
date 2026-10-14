'use strict';
const assert = require( 'node:assert/strict' );
const test = require( 'node:test' );
const { loadTypescript } = require( './helpers.cjs' );

function fixture( buttonConfig, noButtons = false )
{
	const triggers = [];
	const cards = new Map();
	const values = new Map();
	const store = new Map( [ [ 'buttonConfig', buttonConfig ] ] );
	const device = {
		getStoreValue: name => store.get( name ),
		setStoreValue: async( name, value ) => store.set( name, value ),
		getCapabilityValue: name => values.get( name ),
		setCapabilityValue: async( name, value ) => values.set( name, value ),
		error() {}
	};
	const homey = { flow: { getDeviceTriggerCard: id =>
	{
		const card = {
			trigger: async( ...args ) => { triggers.push( { id, args } ); },
			registerArgumentAutocompleteListener: ( name, callback ) => { card.autocomplete = callback; },
			registerRunListener: callback => { card.run = callback; }
		};
		cards.set( id, card );
		return card;
	} } };
	const { Button } = loadTypescript( 'features/Button.ts' );
	Button.RegisterCards( homey );
	const feature = new Button( device, noButtons );
	return { feature, device, triggers, cards, store };
}

for( const config of [ null, undefined ] )
{
	test( 'single button supports ' + String( config ) + ' config without replaying its first timestamp', async () =>
	{
		const f = fixture( config );
		assert.deepEqual( Array.from( f.feature.GetCapabilities(), capability => capability.name ), [ 'button.single' ] );
		await f.feature.Update( { button: { lastpressedtimestamp: '1675272402' } } );
		await f.feature.Update( { button: { lastpressedtimestamp: '1675272402' } } );
		assert.equal( f.triggers.length, 0 );
		await f.feature.Update( { button: { lastpressedtimestamp: '1675272403' } } );
		assert.equal( f.triggers.length, 1 );
		assert.equal( f.triggers[0].id, 'button_single_triggered' );
		assert.equal( f.triggers[0].args[0], f.device );
	} );
}

test( 'multiple buttons trigger only the changed button and keep its Flow selection', async () =>
{
	const config = [ { id: 'top', name: 'Top' }, { id: 'bottom', name: 'Bottom' } ];
	const f = fixture( config );
	assert.deepEqual( Array.from( f.feature.GetCapabilities(), capability => capability.name ),
		[ 'button.0', 'button_name_0', 'button.1', 'button_name_1' ] );
	const data = { button: [
		{ name: 'Top', lastpressedtimestamp: '10' }, { name: 'Bottom', lastpressedtimestamp: '20' }
	] };
	await f.feature.Update( data );
	await f.feature.Update( data );
	assert.equal( f.triggers.length, 0 );
	data.button[1].lastpressedtimestamp = '21';
	await f.feature.Update( data );
	assert.equal( f.triggers.length, 1 );
	assert.equal( f.triggers[0].id, 'button_triggered' );
	assert.equal( f.triggers[0].args[0], f.device );
	assert.deepEqual( f.triggers[0].args[2], config[1] );
	const card = f.cards.get( 'button_triggered' );
	assert.equal( card.run( { name: config[1] }, f.triggers[0].args[2] ), true );
	assert.equal( card.run( { name: config[0] }, f.triggers[0].args[2] ), false );
	data.button[0].name = 'Renamed top';
	await f.feature.Update( data );
	assert.equal( f.store.get( 'buttonConfig' )[0].name, 'Renamed top' );
	assert.equal( f.triggers.length, 1 );
} );

test( 'no-buttons flag prevents button capabilities and timestamp triggers', async () =>
{
	const f = fixture( [ { id: 'top', name: 'Top' } ], true );
	assert.equal( f.feature.GetCapabilities().length, 0 );
	await f.feature.Update( { button: [ { name: 'Top', lastpressedtimestamp: '10' } ] } );
	await f.feature.Update( { button: [ { name: 'Top', lastpressedtimestamp: '11' } ] } );
	assert.equal( f.triggers.length, 0 );
} );
