'use strict';
const assert = require( 'node:assert/strict' );
const test = require( 'node:test' );
const fs = require( 'node:fs' );
const path = require( 'node:path' );
const { root, loadTypescript } = require( './helpers.cjs' );
const flow = JSON.parse( fs.readFileSync( path.join( root, 'drivers/universal/driver.flow.compose.json' ), 'utf8' ) );
const card = flow.conditions.find( condition => condition.id === 'temperature_is' );

test( 'the registered temperature condition includes equality only before inversion', async () =>
{
	const { Temperature } = loadTypescript( 'features/Temperature.ts', {
		[ path.resolve( root, 'lib/BaseFeature.ts' ) ]: { BaseFeature: class {} }
	} );
	let runListener;
	Temperature.RegisterCards( { flow: { getConditionCard( id )
	{
		assert.equal( id, card.id );
		return { registerRunListener( listener ) { runListener = listener; } };
	} } } );
	assert.equal( typeof runListener, 'function' );

	for( const [ measured, expected ] of [ [ 19.5, false ], [ 20, true ], [ 20.5, true ] ] )
	{
		const result = await runListener( { temperature: 20, device: { getCapabilityValue( capability )
		{
			assert.equal( capability, 'measure_temperature' );
			return measured;
		} } } );
		assert.equal( result, expected, 'non-inverted result at ' + measured + ' °C' );
		assert.equal( !result, measured < 20, 'inverted result at ' + measured + ' °C' );
	}
} );

test( 'English and German Flow titles describe the comparison and its strict inverse', () =>
{
	const titles = {
		en: [ 'Temperature is equal to or above', 'Temperature is below' ],
		de: [ 'Temperatur ist gleich oder über', 'Temperatur ist unter' ]
	};
	for( const [ language, variants ] of Object.entries( titles ) )
	{
		for( const [ inverted, expected ] of variants.entries() )
		{
			const render = title => title.replace( /!\{\{([^|]+)\|([^}]+)\}\}/g,
				( _, normal, inverse ) => inverted ? inverse : normal );
			assert.equal( render( card.title[language] ), expected );
			assert.equal( render( card.titleFormatted[language] ).replace( '[[temperature]]', '20' ), expected + ' 20 °C' );
		}
	}
} );
