'use strict';
const assert = require( 'node:assert/strict' );
const test = require( 'node:test' );
const path = require( 'node:path' );
const { root, loadTypescript, createApp, deferred, flush } = require( './helpers.cjs' );
const overview = { data: { dect: { led: 'led green' } } };
const forbidden = { response: { statusCode: 403 } };

function universalDriver( fixture )
{
	const Driver = loadTypescript( 'drivers/universal/driver.ts', {
		homey: { Driver: class {} },
		[ path.resolve( root, 'lib/FritzboxManager.ts' ) ]: { FritzboxManager: {} },
		[ path.resolve( root, 'types/FritzboxTypes.ts' ) ]: { FritzboxBitmask: {}, HanFunTypes: {} }
	} );
	const driver = new Driver();
	driver.homey = fixture.homey;
	driver.fritzbox = fixture.manager;
	fixture.manager.FilterDevices = devices => devices;
	fixture.manager.deviceListCalls = 0;
	fixture.manager.api.getDeviceList = async () =>
	{
		fixture.manager.deviceListCalls++;
		return [ { identifier: 'device-1', name: 'Smart Home device', present: true, functionbitmask: '512' } ];
	};
	return driver;
}

test( 'session-only login obtains a SID without requesting router overview', async () =>
{
	const { EventEmitter } = require( 'node:events' );
	const sessions = [];
	const { FritzboxClient } = loadTypescript( 'lib/FritzboxClient.ts', {
		'node:https': {
			request( url, options, callback )
			{
				assert.equal( url.pathname, '/login_sid.lua', 'login must only request a session' );
				sessions.push( { url: url.toString(), options } );
				const request = new EventEmitter();
				request.end = () => queueMicrotask( () =>
				{
					const response = new EventEmitter();
					response.statusCode = 200;
					response.headers = { 'content-type': 'text/xml' };
					response.setEncoding = () => {};
					callback( response );
					response.emit( 'data', '<SessionInfo><SID>0123456789abcdef</SID></SessionInfo>' );
					response.emit( 'end' );
				} );
				return request;
			}
		}
	} );
	const api = new FritzboxClient( 'restricted-user', 'password', 'https://fritz.box', true );
	await api.login();
	await api.login();
	assert.equal( sessions.length, 1 );
	assert.equal( sessions[0].url, 'https://fritz.box/login_sid.lua?version=2' );
	assert.equal( sessions[0].options.rejectUnauthorized, true );
} );

test( 'disabled network polling still attempts DECT detection without requiring overview permission', async () =>
{
	for( const requestSmartHome of [ true, false ] )
	{
		const f = await createApp( { request_smarthome: requestSmartHome, request_network: false,
			dect_supported: false, dect_enabled: false } );
		f.manager.api.overviewError = forbidden;
		assert.equal( f.homey.settings.get( 'dect_supported' ), undefined );
		assert.equal( f.homey.settings.get( 'dect_enabled' ), undefined );
		const ready = f.app.EnsureLogin();
		await flush();
		f.request().resolve( overview );
		await ready;
		await flush();
		assert.equal( f.manager.api.requests.length, 1 );
		assert.equal( f.manager.api.overviewRequests.length, 1 );
		assert.equal( f.homey.settings.get( 'validation' ), 1 );
		assert.equal( f.homey.settings.get( 'validationInfo' ), '' );
		assert.equal( f.homey.settings.get( 'dect_supported' ), undefined );
		assert.equal( f.homey.settings.get( 'dect_enabled' ), undefined );
		assert.equal( f.manager.updated.length, 0 );
	}
} );

test( 'initial DECT detection is independent of both polling settings and previous DECT metadata', async () =>
{
	for( const requestSmartHome of [ false, true ] )
	{
		for( const requestNetwork of [ false, true ] )
		{
			const f = await createApp( { request_smarthome: requestSmartHome, request_network: requestNetwork,
				dect_supported: false, dect_enabled: false } );
			const ready = f.app.EnsureLogin();
			await flush();
			f.request().resolve( overview );
			await ready;
			await flush();
			assert.equal( f.manager.api.overviewRequests.length, 1 );
			assert.equal( f.homey.settings.get( 'dect_supported' ), true );
			assert.equal( f.homey.settings.get( 'dect_enabled' ), true );
			assert.equal( f.homey.settings.get( 'validation' ), 1 );
		}
	}
} );

test( 'successful initial overview updates router data and starts polling', async () =>
{
	const f = await createApp();
	const ready = f.app.EnsureLogin();
	await flush();
	f.request().resolve( overview );
	await ready;
	await flush();
	assert.equal( f.manager.api.overviewRequests.length, 1 );
	assert.equal( f.homey.settings.get( 'dect_supported' ), true );
	assert.equal( f.homey.settings.get( 'dect_enabled' ), true );
	assert.equal( f.manager.updated[0], overview );
	assert.equal( f.manager.pollingStarted.length, 1 );
} );

test( 'forbidden optional overview preserves successful authentication and unknown DECT state', async () =>
{
	const f = await createApp( { request_network: true } );
	f.manager.api.overviewError = forbidden;
	const ready = f.app.EnsureLogin();
	await flush();
	f.request().resolve( overview );
	await ready;
	await flush();
	assert.equal( f.manager.api.overviewRequests.length, 1 );
	assert.equal( f.homey.settings.get( 'validation' ), 1 );
	assert.equal( f.homey.settings.get( 'validationInfo' ), '' );
	assert.equal( f.homey.settings.get( 'dect_supported' ), undefined );
	assert.equal( f.homey.settings.get( 'dect_enabled' ), undefined );
	assert.equal( f.homey.timers.size, 0 );
	assert.equal( f.manager.updated.length, 0 );
	assert.equal( f.manager.pollingStarted.length, 1 );
	assert.equal( f.homey.errors.length, 1 );
} );

test( 'an installed router device still receives overview when network polling is disabled', async () =>
{
	const f = await createApp( { request_network: false } );
	f.homey.drivers = { getDriver: id =>
	{
		assert.equal( id, 'fritzbox' );
		return { getDevices: () => [ { id: 'router-1' } ] };
	} };
	const ready = f.app.EnsureLogin();
	await flush();
	f.request().resolve( overview );
	await ready;
	await flush();
	assert.equal( f.manager.api.overviewRequests.length, 1 );
	assert.equal( f.manager.updated[0], overview );
	assert.equal( f.homey.settings.get( 'dect_supported' ), true );
} );

test( 'a timed-out initial overview does not invalidate authentication or schedule login retries', async () =>
{
	const f = await createApp( { request_network: false } );
	f.manager.api.overviewError = { error: { code: 'ETIMEDOUT' } };
	const ready = f.app.EnsureLogin();
	await flush();
	f.request().resolve( overview );
	await ready;
	await flush();
	assert.equal( f.homey.settings.get( 'validation' ), 1 );
	assert.equal( f.homey.settings.get( 'validationInfo' ), '' );
	assert.equal( f.manager.api.overviewRequests.length, 1 );
	assert.equal( f.homey.settings.get( 'dect_supported' ), undefined );
	assert.equal( f.homey.settings.get( 'dect_enabled' ), undefined );
	assert.equal( f.homey.timers.size, 0 );
	assert.equal( f.manager.pollingStarted.length, 1 );
	assert.equal( f.homey.errors.length, 1 );
} );

test( 'a superseded optional overview cannot write DECT metadata or start old polling', async () =>
{
	const f = await createApp();
	const older = f.manager.api;
	const response = deferred();
	older.overviewPromise = response.promise;
	const ready = f.app.EnsureLogin();
	await flush();
	f.request().resolve( overview );
	await flush();
	assert.equal( older.overviewRequests.length, 1 );
	f.homey.settings.set( 'request_network', false );
	f.homey.settings.set( 'password', 'corrected-password' );
	await flush();
	const currentOverview = { data: {} };
	f.request().resolve( currentOverview );
	await ready;
	await flush();
	assert.equal( f.manager.api.overviewRequests.length, 1 );
	assert.equal( f.manager.pollingStarted.length, 1 );
	response.resolve( overview );
	await flush();
	assert.equal( older.overviewRequests.length, 1 );
	assert.equal( f.homey.settings.get( 'validation' ), 1 );
	assert.equal( f.homey.settings.get( 'dect_supported' ), false );
	assert.equal( f.homey.settings.get( 'dect_enabled' ), false );
	assert.equal( f.manager.updated.length, 1 );
	assert.equal( f.manager.updated[0], currentOverview );
	assert.equal( f.manager.pollingStarted.length, 1 );
} );

test( 'unknown DECT metadata allows universal pairing to request Smart Home devices', async () =>
{
	const f = await createApp( { request_network: false } );
	f.manager.api.overviewError = forbidden;
	const driver = universalDriver( f );
	const ready = driver.onPairListDevices();
	await flush();
	f.request().resolve( overview );
	const devices = await ready;
	assert.equal( f.manager.api.overviewRequests.length, 1 );
	assert.equal( f.homey.settings.get( 'dect_supported' ), undefined );
	assert.equal( f.manager.deviceListCalls, 1 );
	assert.equal( devices[0].name, 'Smart Home device' );
} );

test( 'known DECT metadata retains unsupported and disabled gates and the enabled override', async () =>
{
	for( const [ metadata, skip, message, calls ] of [
		[ { data: {} }, false, 'Message.DECTNotSupported', 0 ],
		[ { data: {} }, true, 'Message.DECTNotSupported', 0 ],
		[ { data: { dect: { led: 'led off' } } }, false, 'Message.DECTDisabled', 0 ],
		[ { data: { dect: { led: 'led off' } } }, true, '', 1 ]
	] )
	{
		const f = await createApp( { skipdectcheck: skip } );
		const driver = universalDriver( f );
		const ready = driver.onPairListDevices();
		const result = message ? assert.rejects( ready, error => error.message === message ) : ready;
		await flush();
		f.request().resolve( metadata );
		await result;
		assert.equal( f.manager.deviceListCalls, calls );
	}
} );
