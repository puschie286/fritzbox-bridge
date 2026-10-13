'use strict';
const assert = require( 'node:assert/strict' );
const test = require( 'node:test' );
const path = require( 'node:path' );
const { root, loadTypescript, createHomey } = require( './helpers.cjs' );
const original = { username: 'first-user', password: 'first-password', url: 'http://fritz.box', strictSSL: true };

async function createDevices()
{
	const homey = createHomey();
	class MockApi
	{
		constructor( username, password, url, strictSSL )
		{
			this.configuration = { username, password, url, strictSSL };
			this.commands = [];
		}
		async setSwitchOn( id ) { this.commands.push( [ 'on', id ] ); }
		async setSwitchOff( id ) { this.commands.push( [ 'off', id ] ); }
	}
	const { FritzboxManager } = loadTypescript( 'lib/FritzboxManager.ts', {
		[ path.resolve( root, 'types/FritzApi.ts' ) ]: { FritzApi: MockApi },
		[ path.resolve( root, 'lib/FritzboxTracker.ts' ) ]: { FritzboxTracker: class {} }
	} );
	const manager = new FritzboxManager( homey );
	const connect = configuration => manager.Connect( configuration.username, configuration.password,
		configuration.url, configuration.strictSSL );
	connect( original );
	const { Outlet } = loadTypescript( 'features/Outlet.ts' );
	class HomeyDevice
	{
		constructor( id )
		{
			this.homey = homey;
			this.id = id;
			this.capabilities = [];
			this.listeners = new Map();
		}
		getName() { return this.id; }
		getData() { return { id: this.id }; }
		getStoreValue() { return 512; }
		getCapabilities() { return this.capabilities; }
		async addCapability( name ) { this.capabilities.push( name ); }
		registerCapabilityListener( name, callback ) { this.listeners.set( name, callback ); }
		log() {}
	}
	const { BaseDevice } = loadTypescript( 'lib/BaseDevice.ts', {
		homey: { Device: HomeyDevice },
		[ path.resolve( root, 'lib/FritzboxManager.ts' ) ]: { FritzboxManager },
		[ path.resolve( root, 'lib/FunctionFactory.ts' ) ]: {
			FunctionFactory: { Create: ( mask, device ) => [ new Outlet( device ) ] }
		}
	} );
	const devices = [ new BaseDevice( 'outlet-1' ), new BaseDevice( 'outlet-2' ) ];
	for( const device of devices ) await device.onInit();
	assert.deepEqual( homey.errors, [] );
	return { manager, connect, devices };
}

for( const change of [
	{ username: 'corrected-user' }, { password: 'corrected-password' },
	{ url: 'https://192.168.178.1' }, { strictSSL: false }
] )
{
	const setting = Object.keys( change )[0];
	test( `existing device listeners use the new connection after changing ${setting}`, async () =>
	{
		const f = await createDevices();
		const oldApi = f.manager.GetApi();
		const listeners = f.devices.map( device => device.listeners.get( 'onoff' ) );
		const features = f.devices.map( device => device.GetFeature( 'Outlet' ) );
		await listeners[0]( true );
		f.connect( { ...original, ...change } );
		const newApi = f.manager.GetApi();
		assert.notEqual( newApi, oldApi );
		assert.deepEqual( newApi.configuration, { ...original, ...change } );
		for( const [ index, device ] of f.devices.entries() )
		{
			await listeners[index]( false );
			assert.equal( device.GetFeature( 'Outlet' ), features[index] );
			assert.equal( device.listeners.get( 'onoff' ), listeners[index] );
		}
		assert.deepEqual( oldApi.commands, [ [ 'on', 'outlet-1' ] ] );
		assert.deepEqual( newApi.commands, [ [ 'off', 'outlet-1' ], [ 'off', 'outlet-2' ] ] );
	} );
}
