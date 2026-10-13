'use strict';
const assert = require( 'node:assert/strict' );
const test = require( 'node:test' );
const path = require( 'node:path' );
const { root, createApp, loadTypescript, flush } = require( './helpers.cjs' );
const preferences = { pollinginterval: 60, request_smarthome: true, request_network: true,
	showunconnected: false, allowmultiple: false, skipdectcheck: false };
const connection = { username: 'first-user', password: 'first-password', fritzboxip: 'http://fritz.box', strictssl: false };
const overview = { data: { dect: { led: 'led green' } } };

test( 'complete settings are saved before a single validation starts', async () =>
{
	const f = await createApp( { ...preferences, strictssl: false } );
	const form = { ...connection, ...preferences, username: 'new-user', password: 'new-password',
		pollinginterval: 120, request_network: false, showunconnected: true };
	f.app.SaveSettings( form );
	for( const [ key, value ] of Object.entries( form ) ) assert.equal( f.homey.settings.get( key ), value );
	assert.equal( f.manager.connections.length, 2 );
	assert.equal( f.manager.pollingStarted.length, 0 );
	assert.equal( f.homey.timers.size, 1 );
	assert.equal( f.manager.connections.reduce( ( count, item ) => count + item.requests.length, 0 ), 0 );
	await f.runTimer();
	assert.equal( f.manager.api.requests.length, 1 );
	f.request().resolve( overview );
	await flush();
	assert.deepEqual( f.manager.pollingStarted, [ 120000 ] );
} );

test( 'preferences saved during a pending check use its shared connection and updated interval', async () =>
{
	const f = await createApp( { ...preferences, strictssl: false } );
	const ready = f.app.EnsureLogin();
	await flush();
	f.app.SaveSettings( { ...connection, ...preferences, pollinginterval: 1.5, request_network: false } );
	assert.equal( f.manager.connections.length, 1 );
	assert.equal( f.manager.api.requests.length, 1 );
	assert.equal( f.manager.pollingStarted.length, 0 );
	f.request().resolve( overview );
	await ready;
	await flush();
	assert.deepEqual( f.manager.pollingStarted, [ 1500 ] );
} );

test( 'full-form saving applies untouched preferences from the submitted snapshot', async () =>
{
	const f = await createApp( { ...preferences, strictssl: false } );
	f.homey.settings.set( 'pollinginterval', 120 );
	f.app.SaveSettings( { ...connection, ...preferences, password: 'new-password' } );
	assert.equal( f.homey.settings.get( 'pollinginterval' ), 60 );
	assert.equal( f.homey.settings.get( 'password' ), 'new-password' );
} );

test( 'invalid form values are rejected before any settings change', async () =>
{
	for( const invalid of [ { pollinginterval: 0 }, { pollinginterval: 86401 }, { pollinginterval: NaN },
		{ pollinginterval: Infinity }, { pollinginterval: '60' }, { request_network: 'false' },
		{ skipdectcheck: undefined }, { password: null } ] )
	{
		const f = await createApp( { ...preferences, strictssl: false } );
		assert.throws( () => f.app.SaveSettings( { ...connection, ...preferences, username: 'new-user', ...invalid } ),
			/Message.InvalidConfiguration/ );
		for( const [ key, value ] of Object.entries( { ...connection, ...preferences } ) )
		{
			assert.equal( f.homey.settings.get( key ), value );
		}
		assert.equal( f.manager.connections.length, 1 );
	}
} );

test( 'extra fields cannot overwrite app-owned status or arbitrary settings', async () =>
{
	const f = await createApp( { ...preferences, strictssl: false } );
	f.app.SaveSettings( { ...connection, ...preferences, validation: 1, validationInfo: 'injected', unexpected: 'injected' } );
	assert.equal( f.homey.settings.get( 'validation' ), 2 );
	assert.equal( f.homey.settings.get( 'validationInfo' ), '' );
	assert.equal( f.homey.settings.get( 'unexpected' ), undefined );
} );

test( 'failed full-form persistence restores credentials and preferences without starting another check', async () =>
{
	const original = { ...connection, ...preferences };
	const f = await createApp( original );
	const set = f.homey.settings.set;
	f.homey.settings.set = ( key, value ) =>
	{
		if( key === 'skipdectcheck' && value === true ) throw new Error( 'storage failure' );
		set( key, value );
	};
	assert.throws( () => f.app.SaveSettings( { ...original, username: 'new-user', password: 'new-password',
		pollinginterval: 120, request_network: false, showunconnected: true, skipdectcheck: true } ), /storage failure/ );
	for( const [ key, value ] of Object.entries( original ) ) assert.equal( f.homey.settings.get( key ), value );
	assert.equal( f.manager.connections.length, 1 );
	assert.equal( f.manager.pollingStarted.length, 0 );
} );

test( 'rollback removes newly created preferences that were previously unset', async () =>
{
	const f = await createApp();
	const set = f.homey.settings.set;
	f.homey.settings.set = ( key, value ) =>
	{
		if( key === 'skipdectcheck' ) throw new Error( 'storage failure' );
		set( key, value );
	};
	assert.throws( () => f.app.SaveSettings( { ...connection, ...preferences } ), /storage failure/ );
	for( const key of Object.keys( preferences ) ) assert.equal( f.homey.settings.get( key ), undefined );
	assert.equal( f.homey.settings.get( 'strictssl' ), undefined );
	assert.equal( f.manager.connections.length, 1 );
} );

test( 'the endpoint still supports an explicit retry without a form', async () =>
{
	const f = await createApp();
	await f.runTimer();
	f.request().reject( '0000000000000000' );
	await flush();
	const api = loadTypescript( 'api.ts', {
		[ path.resolve( root, 'lib/FritzboxManager.ts' ) ]: { FritzboxManager: {} }
	} );
	assert.equal( await api.retryLogin( { homey: f.homey, body: {} } ), true );
	assert.equal( f.homey.settings.get( 'validation' ), 2 );
	assert.equal( f.manager.connections.length, 2 );
} );
