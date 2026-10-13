'use strict';
const assert = require( 'node:assert/strict' );
const test = require( 'node:test' );
const { createApp, deferred, flush } = require( './helpers.cjs' );
const overview = { data: { dect: { led: 'led green' } } };
const timeout = { error: { code: 'ETIMEDOUT' } };

test( 'an older failed check cannot overwrite corrected credentials that succeeded', async () =>
{
	const f = await createApp();
	await f.runTimer();
	const older = f.request();
	f.homey.settings.set( 'password', 'corrected-password' );
	await f.runTimer();
	f.request().resolve( overview );
	await flush();
	older.reject( '0000000000000000' );
	await flush();
	assert.equal( f.homey.settings.get( 'validation' ), 1 );
	assert.equal( f.homey.settings.get( 'validationInfo' ), '' );
	assert.equal( f.manager.pollingStarted.length, 1 );
} );

test( 'an older successful check cannot overwrite the latest failed credentials', async () =>
{
	const f = await createApp();
	await f.runTimer();
	const older = f.request();
	f.homey.settings.set( 'password', 'new-password' );
	await f.runTimer();
	f.request().reject( '0000000000000000' );
	await flush();
	older.resolve( overview );
	await flush();
	assert.equal( f.homey.settings.get( 'validation' ), 0 );
	assert.equal( f.homey.settings.get( 'validationInfo' ), 'Message.InvalidLogin' );
	assert.equal( f.manager.updated.length, 0 );
	assert.equal( f.manager.pollingStarted.length, 0 );
} );

test( 'rapid settings changes cancel startup validation and check the latest credentials', async () =>
{
	const f = await createApp();
	f.homey.settings.set( 'username', 'corrected-user' );
	f.homey.settings.set( 'password', 'corrected-password' );
	assert.equal( f.homey.timers.size, 1 );
	await f.runTimer();
	assert.equal( f.manager.api.username, 'corrected-user' );
	assert.equal( f.manager.api.password, 'corrected-password' );
	assert.equal( f.manager.connections.reduce( ( count, c ) => count + c.requests.length, 0 ), 1 );
	f.request().resolve( overview );
	await flush();
	assert.equal( f.homey.settings.get( 'validation' ), 1 );
	assert.equal( f.homey.timers.size, 0 );
} );

test( 'pending pairing starts validation immediately and shares it between callers', async () =>
{
	const f = await createApp();
	const first = f.app.EnsureLogin();
	const second = f.app.EnsureLogin();
	await flush();
	assert.equal( f.homey.timers.size, 0 );
	assert.equal( f.manager.api.requests.length, 1 );
	f.request().resolve( overview );
	await Promise.all( [ first, second ] );
	assert.equal( f.homey.settings.get( 'validation' ), 1 );
} );

test( 'pairing follows changed credentials without waiting for an obsolete request', async () =>
{
	const f = await createApp();
	let completed = false;
	const completion = f.app.EnsureLogin().then( () => { completed = true; } );
	await flush();
	const older = f.request();
	f.app.RetryLogin( {
		username: 'corrected-user', password: 'corrected-password', fritzboxip: 'http://fritz.box', strictssl: false
	} );
	await flush();
	assert.equal( f.manager.api.requests.length, 1 );
	f.request().resolve( overview );
	await flush();
	assert.equal( completed, true );
	await completion;
	older.reject( '0000000000000000' );
	await flush();
	assert.equal( f.homey.settings.get( 'validation' ), 1 );
} );

test( 'transient startup failure retries automatically and recovers', async () =>
{
	const f = await createApp();
	await f.runTimer();
	f.request().reject( timeout );
	await flush();
	assert.equal( f.homey.settings.get( 'validation' ), 0 );
	assert.equal( f.homey.settings.get( 'validationInfo' ), 'Message.Timeout' );
	assert.equal( await f.runTimer(), 5000 );
	f.request().resolve( overview );
	await flush();
	assert.equal( f.homey.settings.get( 'validation' ), 1 );
	assert.equal( f.homey.settings.get( 'validationInfo' ), '' );
	assert.equal( f.homey.timers.size, 0 );
	assert.equal( f.manager.pollingStarted.length, 1 );
} );

test( 'retries back off to sixty seconds and reset after changing credentials', async () =>
{
	const f = await createApp();
	await f.runTimer();
	for( const delay of [ 5000, 10000, 20000, 40000, 60000, 60000 ] )
	{
		f.request().reject( timeout );
		await flush();
		assert.equal( f.homey.timers.size, 1 );
		assert.equal( await f.runTimer(), delay );
	}
	const older = f.request();
	f.homey.settings.set( 'password', 'corrected-password' );
	await f.runTimer();
	older.reject( timeout );
	await flush();
	assert.equal( f.homey.timers.size, 0 );
	f.request().reject( timeout );
	await flush();
	assert.equal( await f.runTimer(), 5000 );
	f.request().resolve( overview );
	await flush();
	assert.equal( f.homey.timers.size, 0 );
} );

for( const [ name, error, message ] of [
	[ 'rejected credentials', '0000000000000000', 'Message.InvalidLogin' ],
	[ 'certificate failure', { error: { code: 'DEPTH_ZERO_SELF_SIGNED_CERT' } }, 'Message.InvalidSSL' ],
	[ 'permission failure', { response: { statusCode: 403 } }, 'Message.AccessForbidden' ]
] )
{
	test( name + ' retains its actual error and requires manual retry', async () =>
	{
		const f = await createApp();
		await f.runTimer();
		f.request().reject( error );
		await flush();
		assert.equal( f.homey.settings.get( 'validation' ), 0 );
		assert.equal( f.homey.settings.get( 'validationInfo' ), message );
		assert.equal( f.homey.timers.size, 0 );
	} );
}

test( 'manual retry rechecks unchanged credentials after failure', async () =>
{
	const f = await createApp();
	await f.runTimer();
	f.request().reject( '0000000000000000' );
	await flush();
	f.app.RetryLogin();
	assert.equal( f.homey.settings.get( 'validation' ), 2 );
	await f.runTimer();
	f.request().resolve( overview );
	await f.app.EnsureLogin();
	assert.equal( f.homey.settings.get( 'validation' ), 1 );
} );

test( 'a saved connection is applied together and repeated requests share its check', async () =>
{
	const f = await createApp();
	f.app.RetryLogin( {
		username: 'corrected-user', password: 'corrected-password', fritzboxip: 'http://192.168.178.1', strictssl: true
	} );
	f.app.RetryLogin();
	assert.equal( f.manager.connections.length, 2 );
	assert.equal( f.homey.timers.size, 1 );
	await f.runTimer();
	assert.equal( f.manager.api.username, 'corrected-user' );
	assert.equal( f.manager.api.password, 'corrected-password' );
	assert.equal( f.manager.api.url, 'http://192.168.178.1' );
	assert.equal( f.manager.api.strictSSL, true );
	assert.equal( f.manager.connections.reduce( ( count, c ) => count + c.requests.length, 0 ), 1 );
	f.request().resolve( overview );
	await f.app.EnsureLogin();
} );

test( 'malformed configuration does not partially save credentials', async () =>
{
	const f = await createApp();
	assert.throws( () => f.app.RetryLogin( {
		username: 'changed', password: 123, fritzboxip: 'fritz.box', strictssl: false
	} ), /Message.InvalidConfiguration/ );
	assert.equal( f.homey.settings.get( 'username' ), 'first-user' );
	assert.equal( f.manager.connections.length, 1 );
} );

test( 'failed persistence rolls back connection changes before starting another check', async () =>
{
	const f = await createApp();
	const set = f.homey.settings.set;
	f.homey.settings.set = ( key, value ) =>
	{
		if( key === 'password' && value === 'new-password' ) throw new Error( 'save failed' );
		set( key, value );
	};
	assert.throws( () => f.app.RetryLogin( {
		username: 'changed', password: 'new-password', fritzboxip: 'http://fritz.box', strictssl: false
	} ), /save failed/ );
	assert.equal( f.homey.settings.get( 'username' ), 'first-user' );
	assert.equal( f.manager.connections.length, 1 );
} );

for( const kind of [ 'updateError', 'pollingError' ] )
{
	test( kind + ' after authentication does not invalidate the successful login', async () =>
	{
		const f = await createApp();
		f.manager[kind] = new Error( 'device service unavailable' );
		const completion = f.app.EnsureLogin();
		await flush();
		f.request().resolve( overview );
		await completion;
		await flush();
		assert.equal( f.homey.settings.get( 'validation' ), 1 );
		assert.equal( f.homey.settings.get( 'validationInfo' ), '' );
		assert.ok( f.homey.errors.length > 0 );
	} );
}

test( 'a superseded device update cannot start polling for its old login', async () =>
{
	const f = await createApp();
	const update = deferred();
	f.manager.updatePromise = update.promise;
	const completion = f.app.EnsureLogin();
	await flush();
	f.request().resolve( overview );
	await completion;
	f.homey.settings.set( 'password', 'changed' );
	update.resolve();
	await flush();
	assert.equal( f.manager.pollingStarted.length, 0 );
	assert.equal( f.homey.settings.get( 'validation' ), 2 );
} );

test( 'unload cancels delayed validation and ignores subsequent setting changes', async () =>
{
	const f = await createApp();
	f.homey.emit( 'unload' );
	f.homey.settings.set( 'username', 'ignored' );
	await flush();
	assert.equal( f.homey.timers.size, 0 );
	assert.equal( f.manager.api.requests.length, 0 );
	assert.equal( f.manager.connections.length, 1 );
	assert.ok( f.manager.pollingStopped > 0 );
} );

test( 'unload cancels an automatic retry', async () =>
{
	const f = await createApp();
	await f.runTimer();
	f.request().reject( timeout );
	await flush();
	f.homey.emit( 'unload' );
	assert.equal( f.homey.timers.size, 0 );
} );

test( 'unload wakes pairing and ignores login responses already in flight', async () =>
{
	const f = await createApp();
	const completion = assert.rejects( f.app.EnsureLogin(), /Message.LoginRequired/ );
	await flush();
	const request = f.request();
	f.homey.emit( 'unload' );
	await completion;
	request.resolve( overview );
	await flush();
	assert.equal( f.homey.settings.get( 'validation' ), 2 );
	assert.equal( f.manager.updated.length, 0 );
	assert.equal( f.manager.pollingStarted.length, 0 );
	assert.equal( f.homey.timers.size, 0 );
} );
