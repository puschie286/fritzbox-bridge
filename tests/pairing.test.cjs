'use strict';
const assert = require( 'node:assert/strict' );
const test = require( 'node:test' );
const path = require( 'node:path' );
const fs = require( 'node:fs' );
const { root, loadTypescript, createApp, flush } = require( './helpers.cjs' );
const overview = { data: { dect: { led: 'led green' } } };

function pairDriver( fixture, universal )
{
	const replacements = {
		homey: { Driver: class {} },
		[ path.resolve( root, 'lib/FritzboxManager.ts' ) ]: { FritzboxManager: {} },
		[ path.resolve( root, 'types/FritzboxTypes.ts' ) ]: { FritzboxBitmask: {}, HanFunTypes: {} }
	};
	const BaseDriver = loadTypescript( 'lib/BaseDriver.ts', replacements ).BaseDriver;
	const Driver = universal ? loadTypescript( 'drivers/universal/driver.ts', replacements )
		: class extends BaseDriver {};
	const driver = new Driver();
	driver.homey = fixture.homey;
	driver.listCalls = 0;
	driver.GetDeviceList = async () =>
	{
		driver.listCalls++;
		return [ { name: 'test device' } ];
	};
	return driver;
}

for( const universal of [ false, true ] )
{
	const kind = universal ? 'universal pairing' : 'base pairing';
	test( kind + ' waits for startup validation before listing devices', async () =>
	{
		const f = await createApp();
		const driver = pairDriver( f, universal );
		const completion = driver.onPairListDevices();
		await flush();
		assert.equal( driver.listCalls, 0 );
		f.request().resolve( overview );
		const devices = await completion;
		assert.equal( driver.listCalls, 1 );
		assert.equal( devices[0].name, 'test device' );
	} );
	for( const [ info, expected ] of [
		[ 'Message.Timeout', 'Message.Timeout' ],
		[ 'Message.HostNotFound', 'Message.HostNotFound' ],
		[ 'Message.InvalidSSL', 'Message.InvalidSSL' ],
		[ 'Message.AccessForbidden', 'Message.AccessForbidden' ],
		[ 'Message.InvalidLogin', 'Message.FixLogin' ],
		[ '', 'Message.ErrorLogin' ]
	] )
	{
		test( kind + ' reports ' + expected + ' rather than a blanket credential error', async () =>
		{
			const f = await createApp();
			f.homey.settings.set( 'validation', 0 );
			f.homey.settings.set( 'validationInfo', info );
			const driver = pairDriver( f, universal );
			await assert.rejects( driver.onPairListDevices(), error => error.message === expected );
			assert.equal( driver.listCalls, 0 );
		} );
	}
}

test( 'error categories are distinct and translated in both languages', () =>
{
	const { HandleHttpError, IsRetryableHttpError } = loadTypescript( 'lib/Helper.ts' );
	const locales = [ 'en', 'de' ].map( language =>
		JSON.parse( fs.readFileSync( path.join( root, 'locales', language + '.json' ), 'utf8' ) ).Message );
	for( const [ error, key, retry ] of [
		[ { error: { code: 'ENOTFOUND' } }, 'HostNotFound', true ],
		[ { code: 'ECONNREFUSED' }, 'ConnectionFailed', true ],
		[ { cause: { code: 'ESOCKETTIMEDOUT' } }, 'Timeout', true ],
		[ { error: { data: { code: 'ETIMEDOUT' } } }, 'Timeout', true ],
		[ { request: { response: { statusCode: 403 } } }, 'AccessForbidden', false ],
		[ { response: { statusCode: 404 } }, 'NotFound', false ],
		[ { response: { statusCode: 503 } }, 'ServerCrashed', true ],
		[ { error: { code: 'ERR_TLS_CERT_ALTNAME_INVALID' } }, 'InvalidSSL', false ],
		[ '0000000000000000', 'InvalidLogin', false ]
	] )
	{
		assert.equal( HandleHttpError( error ), 'Message.' + key );
		assert.equal( IsRetryableHttpError( error ), retry );
		for( const locale of locales ) assert.ok( locale[key] );
	}
} );

test( 'the retry endpoint applies the complete form without waiting for router responses', async () =>
{
	const f = await createApp();
	const api = loadTypescript( 'api.ts', {
		[ path.resolve( root, 'lib/FritzboxManager.ts' ) ]: { FritzboxManager: {} }
	} );
	const settings = { username: 'corrected-user', password: 'corrected-password', fritzboxip: 'http://fritz.box', strictssl: false,
		pollinginterval: 120, request_smarthome: true, request_network: false,
		showunconnected: false, allowmultiple: false, skipdectcheck: false };
	assert.equal( await api.retryLogin( { homey: f.homey, body: { settings } } ), true );
	assert.equal( f.manager.connections.length, 2 );
	assert.equal( f.manager.api.requests.length, 0 );
	assert.equal( f.homey.settings.get( 'validation' ), 2 );
	assert.equal( f.homey.settings.get( 'pollinginterval' ), 120 );
	assert.equal( f.homey.settings.get( 'request_network' ), false );
} );
