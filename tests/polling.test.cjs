'use strict';
const assert = require( 'node:assert/strict' );
const test = require( 'node:test' );
const path = require( 'node:path' );
const { root, createHomey, loadTypescript } = require( './helpers.cjs' );

function polling( settings = {}, router = false )
{
	const homey = createHomey( settings );
	const smartUpdates = [];
	const networkUpdates = [];
	const routerUpdates = [];
	const intervals = new Map();
	let nextInterval = 0;
	homey.setInterval = callback =>
	{
		const handle = ++nextInterval;
		intervals.set( handle, callback );
		return handle;
	};
	homey.clearInterval = handle => intervals.delete( handle );
	homey.drivers = {
		getDrivers: () => ( { plug: {
			GetBaseFunction: () => 512,
			getDevices: () => [ { getData: () => ( { id: '123' } ), Update: async data => smartUpdates.push( data ),
				setUnavailable: async () => {} } ]
		} } ),
		getDriver: () => ( { getDevices: () => router ? [ { Update: async data => routerUpdates.push( data ) } ] : [] } )
	};
	class FritzboxClient
	{
		constructor() { this.calls = { smart: 0, network: 0, overview: 0 }; }
		async getDeviceList()
		{
			this.calls.smart++;
			return [ { identifier: '123', functionbitmask: 512 } ];
		}
		async getFritzboxNetwork() { this.calls.network++; return { data: { active: [] } }; }
		async getFritzboxOverview() { this.calls.overview++; return { data: { fritzos: { nspver: 'fixture' } } }; }
	}
	class Tracker { async UpdateDevices( data ) { networkUpdates.push( data ); } }
	const Manager = loadTypescript( 'lib/FritzboxManager.ts', {
		[ path.resolve( root, 'lib/FritzboxClient.ts' ) ]: { FritzboxClient },
		[ path.resolve( root, 'lib/FritzboxTracker.ts' ) ]: { FritzboxTracker: Tracker }
	} ).FritzboxManager;
	const manager = new Manager( homey );
	manager.Connect( 'user', 'password', 'http://fritz.box', false );
	return { manager, homey, smartUpdates, networkUpdates, routerUpdates,
		tick: () => intervals.values().next().value() };
}

for( const [ smart, network ] of [ [ false, false ], [ false, true ], [ true, false ], [ true, true ] ] )
{
	test( 'polling honors smart=' + smart + ' and network=' + network, async () =>
	{
		const f = polling( { dect_supported: true, request_smarthome: smart, request_network: network } );
		await f.manager.StartPolling( 60000 );
		assert.deepEqual( f.manager.GetApi().calls, { smart: Number( smart ), network: Number( network ), overview: 0 } );
		assert.equal( f.smartUpdates.length, Number( smart ) );
		assert.equal( f.networkUpdates.length, Number( network ) );
		f.manager.StopPolling();
	} );
}

test( 'absent polling preferences use their enabled defaults', async () =>
{
	for( const value of [ undefined, null ] )
	{
		const f = polling( { request_smarthome: value, request_network: value } );
		await f.manager.StartPolling( 60000 );
		assert.deepEqual( f.manager.GetApi().calls, { smart: 1, network: 1, overview: 0 } );
		f.manager.StopPolling();
	}
} );

test( 'polling switches take effect on subsequent polls without recreating devices', async () =>
{
	const f = polling( { request_smarthome: true, request_network: true } );
	await f.manager.StartPolling( 60000 );
	f.homey.settings.set( 'request_smarthome', false );
	f.homey.settings.set( 'request_network', false );
	await f.tick();
	assert.deepEqual( f.manager.GetApi().calls, { smart: 1, network: 1, overview: 0 } );
	assert.equal( f.smartUpdates.length, 1 );
	assert.equal( f.networkUpdates.length, 1 );
	f.homey.settings.set( 'request_smarthome', true );
	await f.tick();
	assert.deepEqual( f.manager.GetApi().calls, { smart: 2, network: 1, overview: 0 } );
	f.homey.settings.set( 'request_network', true );
	await f.tick();
	assert.deepEqual( f.manager.GetApi().calls, { smart: 3, network: 2, overview: 0 } );
	f.manager.StopPolling();
} );

test( 'explicitly unsupported DECT blocks smart polling while unknown support permits the device API', async () =>
{
	for( const value of [ false, true, undefined, null ] )
	{
		const f = polling( { dect_supported: value, request_smarthome: true, request_network: false } );
		await f.manager.StartPolling( 60000 );
		assert.equal( f.manager.GetApi().calls.smart, value === false ? 0 : 1 );
		assert.equal( f.manager.GetApi().calls.network, 0 );
		f.manager.StopPolling();
	}
} );

test( 'an installed router keeps its status updates independently of network tracking', async () =>
{
	const f = polling( { request_smarthome: false, request_network: false }, true );
	await f.manager.StartPolling( 60000 );
	assert.deepEqual( f.manager.GetApi().calls, { smart: 0, network: 0, overview: 1 } );
	assert.equal( f.routerUpdates.length, 1 );
	assert.equal( f.smartUpdates.length, 0 );
	assert.equal( f.networkUpdates.length, 0 );
	f.manager.StopPolling();
} );
