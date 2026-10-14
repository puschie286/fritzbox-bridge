'use strict';
const assert = require( 'node:assert/strict' );
const test = require( 'node:test' );
const path = require( 'node:path' );
const { root, loadTypescript, deferred, flush } = require( './helpers.cjs' );

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
	const api = { setColor: async( ...args ) => commands.push( args ) };
	const device = {
		getData: () => ( { id: '00001234-1' } ),
		GetAPI: () => api,
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
	return { commands, values, listeners, poll, api };
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

test( 'hue-only writes preserve the current saturation and send every change immediately', async () =>
{
	const f = fixture();
	await f.poll( 107, 82 );
	await f.listeners.get( 'light_hue' )( 35 / 360 );
	await f.listeners.get( 'light_hue' )( 52 / 360 );
	assert.deepEqual( f.commands, [
		[ '00001234-1', 'orange', 140, 500 ], [ '00001234-1', 'yellow', 102, 500 ]
	] );
} );

test( 'saturation-only writes preserve the current hue, including zero saturation', async () =>
{
	const f = fixture();
	await f.poll( 107, 82 );
	await f.listeners.get( 'light_saturation' )( 0 );
	assert.deepEqual( f.commands, [ [ '00001234-1', 'green', 38, 500 ] ] );
	await f.poll( 107, 38 );
	await f.listeners.get( 'light_hue' )( 35 / 360 );
	assert.deepEqual( f.commands.at( -1 ), [ '00001234-1', 'orange', 72, 500 ] );
} );

test( 'ignored color writes do not leave a pending hue for a later saturation command', async () =>
{
	const f = fixture();
	await f.poll( 107, 82 );
	f.values.set( 'light_mode', 'temperature' );
	await f.listeners.get( 'light_hue' )( 35 / 360 );
	assert.equal( f.commands.length, 0 );
	f.values.set( 'light_mode', 'color' );
	await f.listeners.get( 'light_saturation' )( 1 );
	assert.deepEqual( f.commands, [ [ '00001234-1', 'green', 130, 500 ] ] );
} );

test( 'paired hue and saturation callbacks share one complete color command', async () =>
{
	const f = fixture();
	await f.poll( 107, 82 );
	await Promise.all( [
		f.listeners.get( 'light_hue' )( 35 / 360 ),
		f.listeners.get( 'light_saturation' )( 0 )
	] );
	assert.deepEqual( f.commands, [ [ '00001234-1', 'orange', 72, 500 ] ] );
} );

test( 'a color callback arriving during a request retains the newly confirmed counterpart', async () =>
{
	const f = fixture();
	await f.poll( 107, 82 );
	const firstCommand = deferred();
	const send = f.api.setColor;
	f.api.setColor = async( ...args ) =>
	{
		await send( ...args );
		if( f.commands.length === 1 ) await firstCommand.promise;
	};
	const hue = f.listeners.get( 'light_hue' )( 35 / 360 );
	await flush();
	const saturation = f.listeners.get( 'light_saturation' )( 0 );
	await flush();
	assert.equal( f.commands.length, 1 );
	firstCommand.resolve();
	await Promise.all( [ hue, saturation ] );
	assert.deepEqual( f.commands, [
		[ '00001234-1', 'orange', 140, 500 ], [ '00001234-1', 'orange', 72, 500 ]
	] );
} );

test( 'paired color callbacks both receive a failed command', async () =>
{
	const f = fixture();
	await f.poll( 107, 82 );
	const failure = new Error( 'Command failed' );
	f.api.setColor = async () => { throw failure; };
	const results = await Promise.allSettled( [
		f.listeners.get( 'light_hue' )( 35 / 360 ),
		f.listeners.get( 'light_saturation' )( 0 )
	] );
	for( const result of results )
	{
		assert.equal( result.status, 'rejected' );
		assert.equal( result.reason, failure );
	}
} );

for( const capability of [ 'light_hue', 'light_saturation' ] )
{
	test( capability + ' surfaces command failures without reusing the failed value', async () =>
	{
		const f = fixture();
		await f.poll( 107, 82 );
		const failure = new Error( 'Command failed' );
		const send = f.api.setColor;
		f.api.setColor = async () => { throw failure; };
		await assert.rejects( f.listeners.get( capability )( 0 ), error => error === failure );
		f.api.setColor = send;
		if( capability === 'light_hue' )
		{
			await f.listeners.get( 'light_saturation' )( 1 );
			assert.deepEqual( f.commands, [ [ '00001234-1', 'green', 130, 500 ] ] );
		}
		else
		{
			await f.listeners.get( 'light_hue' )( 35 / 360 );
			assert.deepEqual( f.commands, [ [ '00001234-1', 'orange', 140, 500 ] ] );
		}
	} );
}

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
