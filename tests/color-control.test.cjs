'use strict';
const assert = require( 'node:assert/strict' );
const test = require( 'node:test' );
const path = require( 'node:path' );
const { root, loadTypescript } = require( './helpers.cjs' );

// Expected defaults from section 3.6 of the official AHA HTTP specification.
const defaults = [
	[ 'orange', 35, [ 214, 140, 72 ] ], [ 'yellow', 52, [ 153, 102, 51 ] ],
	[ 'lime', 92, [ 123, 79, 38 ] ], [ 'green', 107, [ 130, 82, 38 ] ],
	[ 'turquoise', 155, [ 133, 84, 41 ] ], [ 'cyan', 191, [ 179, 118, 59 ] ],
	[ 'lightblue', 218, [ 169, 110, 56 ] ], [ 'blue', 225, [ 204, 135, 67 ] ],
	[ 'purple', 266, [ 169, 110, 54 ] ], [ 'magenta', 296, [ 140, 92, 46 ] ],
	[ 'pink', 335, [ 163, 107, 51 ] ], [ 'red', 358, [ 179, 112, 54 ] ]
];

function fixture()
{
	const commands = [];
	const values = new Map( [ [ 'light_mode', 'color' ] ] );
	const device = {
		getData: () => ( { id: '00001234-1' } ),
		GetAPI: () => ( { setColor: async( ...args ) => commands.push( args ) } ),
		getCapabilityValue: name => values.get( name ),
		setCapabilityValue: async( name, value ) => values.set( name, value ),
		log() {}, error() {}
	};
	const { ColorControl } = loadTypescript( 'features/ColorControl.ts', {
		[ path.resolve( root, 'types/FritzboxTypes.ts' ) ]: { FritzboxColor: { Red: 'red' }, FritzboxTemperature: {} }
	} );
	const feature = new ColorControl( device );
	const listeners = new Map( feature.Listeners().map( listener => [ listener.name, listener.callback.bind( feature ) ] ) );
	const poll = ( hue, saturation ) => feature.Update( {
		colorcontrol: { current_mode: '1', temperature: '', hue: String( hue ), saturation: String( saturation ) }
	} );
	return { commands, values, listeners, poll };
}

test( 'color polling uses the current hue before converting saturation', async () =>
{
	const f = fixture();
	await f.poll( 35, 140 );
	assert.equal( f.values.get( 'light_saturation' ), 0.5 );
	await f.poll( 92, 38 );
	assert.equal( f.values.get( 'light_saturation' ), 0 );
	await f.poll( '', '' );
	assert.equal( f.values.get( 'light_hue' ), null );
	assert.equal( f.values.get( 'light_saturation' ), null );
} );

for( const [ color, hue, saturations ] of defaults )
{
	test( color + ' reads and writes the documented high, medium and low saturation', async () =>
	{
		const f = fixture();
		for( const [ index, value ] of [ 1, 0.5, 0 ].entries() )
		{
			await f.poll( hue, saturations[index] );
			assert.equal( f.values.get( 'light_hue' ), hue / 360 );
			assert.equal( f.values.get( 'light_saturation' ), value );
			await f.listeners.get( 'light_hue' )( hue / 360 );
			await f.listeners.get( 'light_saturation' )( value );
			assert.deepEqual( f.commands.at( -1 ), [ '00001234-1', color, saturations[index], 500 ] );
		}
	} );
}
