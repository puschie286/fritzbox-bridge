'use strict';
const assert = require( 'node:assert/strict' );
const test = require( 'node:test' );
const path = require( 'node:path' );
const { root, createHomey, loadTypescript, deferred, flush } = require( './helpers.cjs' );

async function fixture( settings = {} )
{
	const homey = createHomey( { request_network: false, ...settings } );
	let tick;
	homey.setInterval = callback => { tick = callback; return 1; };
	homey.clearInterval = () => {};
	class Client
	{
		constructor()
		{
			this.devices = [ { identifier: 'plug', functionbitmask: 512, present: '1' } ];
			this.overview = { data: { fritzos: { nspver: '8.0', isUpdateAvail: false, energy: 20 } } };
			this.calls = { smart: 0, network: 0, overview: 0 };
		}
		async getDeviceList()
		{
			this.calls.smart++;
			if( this.smartError ) throw this.smartError;
			return this.smartResponse ?? this.devices;
		}
		async getFritzboxNetwork()
		{
			this.calls.network++;
			if( this.networkError ) throw this.networkError;
			return { data: { active: [] } };
		}
		async getFritzboxOverview()
		{
			this.calls.overview++;
			if( this.overviewError ) throw this.overviewError;
			return this.overview;
		}
	}
	const { FritzboxManager } = loadTypescript( 'lib/FritzboxManager.ts', {
		[ path.resolve( root, 'lib/FritzboxClient.ts' ) ]: { FritzboxClient: Client },
		[ path.resolve( root, 'lib/FritzboxTracker.ts' ) ]: { FritzboxTracker: class { async UpdateDevices() {} } }
	} );
	const manager = new FritzboxManager( homey );
	class HomeyDevice
	{
		constructor( id )
		{
			this.id = id;
			this.homey = homey;
			this.available = true;
			this.capabilities = [];
			this.values = new Map();
		}
		getName() { return this.id; }
		getData() { return { id: this.id }; }
		getStoreValue() { return 512; }
		getCapabilities() { return this.capabilities; }
		async addCapability( name ) { this.capabilities.push( name ); }
		registerCapabilityListener() {}
		getCapabilityValue( name ) { return this.values.get( name ); }
		async setCapabilityValue( name, value ) { this.values.set( name, value ); }
		getAvailable() { return this.available; }
		async setAvailable() { this.available = true; this.reason = undefined; }
		async setUnavailable( reason ) { this.available = false; this.reason = reason; }
		log() {}
		error( ...args ) { homey.error( ...args ); }
	}
	const { Availability } = loadTypescript( 'features/Availability.ts' );
	const { BaseDevice } = loadTypescript( 'lib/BaseDevice.ts', {
		homey: { Device: HomeyDevice },
		[ path.resolve( root, 'lib/FritzboxManager.ts' ) ]: { FritzboxManager },
		[ path.resolve( root, 'lib/FunctionFactory.ts' ) ]: {
			FunctionFactory: { Create: ( mask, device ) => [ new Availability( device ) ] }
		}
	} );
	const Router = loadTypescript( 'drivers/fritzbox/device.ts', {
		[ path.resolve( root, 'lib/BaseDevice.ts' ) ]: { BaseDevice }
	} );
	const plug = new BaseDevice( 'plug' );
	const router = new Router( 'fritzbox' );
	const drivers = {
		universal: { GetBaseFunction: () => 0, getDevices: () => [ plug ] },
		fritzbox: { GetBaseFunction: () => -1, getDevices: () => [ router ] }
	};
	homey.drivers = { getDrivers: () => drivers, getDriver: id => drivers[id] };
	const connect = () => manager.Connect( 'user', 'password', 'http://fritz.box', false );
	connect();
	await plug.onInit();
	await router.onInit();
	assert.deepEqual( homey.errors, [] );
	return { manager, homey, plug, router, connect, tick: () => tick() };
}

test( 'missing and absent devices become unavailable and recover when present again', async () =>
{
	const f = await fixture();
	assert.equal( f.plug.getAvailable(), false );
	assert.equal( f.router.getAvailable(), false );
	await f.manager.StartPolling( 60000 );
	assert.equal( f.plug.getAvailable(), true );
	assert.equal( f.router.getAvailable(), true );
	const api = f.manager.GetApi();
	api.devices[0].present = '0';
	await f.tick();
	assert.equal( f.plug.getAvailable(), false );
	api.devices[0].present = '1';
	await f.tick();
	assert.equal( f.plug.getAvailable(), true );
	const devices = api.devices;
	api.devices = [];
	await f.tick();
	assert.equal( f.plug.getAvailable(), false );
	assert.equal( f.plug.reason, 'Message.DeviceUnavailable' );
	assert.equal( f.router.getAvailable(), true );
	api.devices = devices;
	await f.tick();
	assert.equal( f.plug.getAvailable(), true );
} );

for( const error of [ { code: 'ETIMEDOUT' }, { statusCode: 403 } ] )
{
	test( 'failed Smart Home polling marks its devices unavailable and retries: ' + JSON.stringify( error ), async () =>
	{
		const f = await fixture();
		await f.manager.StartPolling( 60000 );
		const api = f.manager.GetApi();
		api.smartError = error;
		await f.tick();
		assert.equal( f.plug.getAvailable(), false );
		assert.equal( f.manager.GetLastData(), undefined );
		assert.equal( f.router.getAvailable(), true );
		delete api.smartError;
		await f.tick();
		assert.equal( f.plug.getAvailable(), true );
	} );
}

test( 'a router outage marks both device types unavailable and both recover', async () =>
{
	const f = await fixture();
	await f.manager.StartPolling( 60000 );
	const api = f.manager.GetApi();
	api.smartError = api.overviewError = { code: 'ECONNREFUSED' };
	await f.tick();
	assert.equal( f.plug.getAvailable(), false );
	assert.equal( f.router.getAvailable(), false );
	delete api.smartError;
	delete api.overviewError;
	await f.tick();
	assert.equal( f.plug.getAvailable(), true );
	assert.equal( f.router.getAvailable(), true );
} );

test( 'optional network failures do not block Smart Home or router updates', async () =>
{
	const f = await fixture( { request_network: true } );
	f.manager.GetApi().networkError = { statusCode: 403 };
	await f.manager.StartPolling( 60000 );
	assert.equal( f.plug.getAvailable(), true );
	assert.equal( f.router.getAvailable(), true );
	assert.equal( f.router.values.get( 'os_version' ), '8.0' );
} );

test( 'an overview failure only affects the router and is retried on the next poll', async () =>
{
	const f = await fixture();
	f.manager.GetApi().overviewError = { statusCode: 403 };
	await f.manager.StartPolling( 60000 );
	assert.equal( f.plug.getAvailable(), true );
	assert.equal( f.router.getAvailable(), false );
	delete f.manager.GetApi().overviewError;
	await f.tick();
	assert.equal( f.router.getAvailable(), true );
} );

test( 'an initialized router gets fresh data without waiting for the ten-minute refresh', async () =>
{
	const f = await fixture();
	await f.manager.StartPolling( 60000 );
	await f.router.onInit();
	assert.equal( f.router.getAvailable(), false );
	await f.tick();
	assert.equal( f.router.getAvailable(), true );
	assert.equal( f.manager.GetApi().calls.overview, 2 );
} );

test( 'new connection settings immediately invalidate availability and cached readings', async () =>
{
	const f = await fixture();
	await f.manager.StartPolling( 60000 );
	assert.ok( f.manager.GetLastData() );
	f.connect();
	await flush();
	assert.equal( f.plug.getAvailable(), false );
	assert.equal( f.router.getAvailable(), false );
	assert.equal( f.manager.GetLastData(), undefined );
	// Authentication failure never starts polling, so old readings must stay unavailable.
	assert.equal( f.plug.reason, 'Message.WaitingForData' );
	await f.manager.StartPolling( 60000 );
	assert.equal( f.plug.getAvailable(), true );
	assert.equal( f.router.getAvailable(), true );
	assert.equal( f.manager.GetApi().calls.overview, 1 );
} );

for( const fails of [ false, true ] )
{
	test( 'an obsolete poll cannot change availability after reconnection, fails=' + fails, async () =>
	{
		const f = await fixture();
		const response = deferred();
		f.manager.GetApi().smartResponse = response.promise;
		const oldPoll = f.manager.StartPolling( 60000 );
		await flush();
		f.connect();
		await f.manager.StartPolling( 60000 );
		if( fails ) response.reject( { code: 'ETIMEDOUT' } );
		else response.resolve( [] );
		await oldPoll;
		assert.equal( f.plug.getAvailable(), true );
		assert.equal( f.router.getAvailable(), true );
		assert.equal( f.manager.GetLastData().length, 1 );
		assert.deepEqual( f.homey.errors, [] );
	} );
}

for( const kind of [ 'initialization', 'capability value', 'router update' ] )
{
	test( 'reconnection also cancels an old in-flight ' + kind, async () =>
	{
		const f = await fixture();
		await f.manager.StartPolling( 60000 );
		const entered = deferred();
		const release = deferred();
		const target = kind === 'capability value' ? f.plug.GetFeature( 'Availability' )
			: kind === 'router update' ? f.router : f.plug;
		const method = kind === 'capability value' ? 'GetValue' : 'Initialize';
		const original = target[method].bind( target );
		target[method] = async( ...args ) =>
		{
			entered.resolve();
			await release.promise;
			return original( ...args );
		};
		const oldUpdate = kind === 'router update'
			? f.manager.updateFritzboxData( f.manager.GetApi().overview ) : f.tick();
		await entered.promise;
		f.connect();
		await flush();
		release.resolve();
		await oldUpdate;
		assert.equal( f.plug.getAvailable(), false );
		assert.equal( f.router.getAvailable(), false );
		target[method] = original;
		await f.manager.StartPolling( 60000 );
		assert.equal( f.plug.getAvailable(), true );
		assert.equal( f.router.getAvailable(), true );
	} );
}

test( 'one device update failure does not invalidate healthy devices or valid cached data', async () =>
{
	const f = await fixture();
	await f.manager.StartPolling( 60000 );
	let healthyAvailable = true;
	const healthy = {
		getData: () => ( { id: 'other' } ),
		Update: async data => { assert.equal( data.identifier, 'other' ); healthyAvailable = true; },
		setUnavailable: async () => { healthyAvailable = false; }
	};
	f.homey.drivers.getDrivers().universal.getDevices = () => [ f.plug, healthy ];
	f.manager.GetApi().devices.push( { identifier: 'other', functionbitmask: 512, present: '1' } );
	f.plug.Update = async () => { throw new Error( 'Homey capability update failed' ); };
	await f.tick();
	assert.equal( f.plug.getAvailable(), false );
	assert.equal( healthyAvailable, true );
	assert.equal( f.router.getAvailable(), true );
	assert.equal( f.manager.GetLastData().length, 2 );
} );
