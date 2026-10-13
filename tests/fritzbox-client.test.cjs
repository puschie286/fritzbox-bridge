'use strict';
const assert = require( 'node:assert/strict' );
const test = require( 'node:test' );
const http = require( 'node:http' );
const https = require( 'node:https' );
const fs = require( 'node:fs' );
const path = require( 'node:path' );
const { EventEmitter } = require( 'node:events' );
const { createHash, pbkdf2Sync } = require( 'node:crypto' );
const { loadTypescript, deferred, flush } = require( './helpers.cjs' );

const SID = '0123456789abcdef';
const NEW_SID = 'fedcba9876543210';
const ZERO_SID = '0000000000000000';
const LOGIN_HTML = '<html><body><form action="/login.lua"><input name="username"></form></body></html>';
const plain = value => JSON.parse( JSON.stringify( value ) );
const clientModule = replacements => loadTypescript( 'lib/FritzboxClient.ts', replacements );

function session( sid = SID, challenge, blockTime = 0 )
{
	return '<SessionInfo><SID>' + sid + '</SID>'
		+ ( challenge === undefined ? '' : '<Challenge>' + challenge + '</Challenge>' )
		+ '<BlockTime>' + blockTime + '</BlockTime></SessionInfo>';
}

function send( response, body, status = 200, headers = {} )
{
	response.writeHead( status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers } );
	response.end( body );
}

async function router( t, handler, secure = false )
{
	const requests = [];
	const failures = [];
	const sockets = new Set();
	const listener = ( request, response ) =>
	{
		const chunks = [];
		request.on( 'data', chunk => chunks.push( chunk ) );
		request.on( 'end', async () =>
		{
			const url = new URL( request.url, 'http://localhost' );
			const body = Buffer.concat( chunks ).toString( 'utf8' );
			const record = {
				method: request.method, path: url.pathname, query: Object.fromEntries( url.searchParams ),
				body, form: Object.fromEntries( new URLSearchParams( body ) ), headers: request.headers
			};
			requests.push( record );
			try { await handler( record, response, request ); }
			catch( error )
			{
				failures.push( error );
				if( !response.headersSent ) send( response, 'Fixture handler failed', 500 );
				else response.destroy();
			}
		} );
	};
	const server = secure ? https.createServer( {
		key: fs.readFileSync( path.join( __dirname, 'fixtures/client-local-key.pem' ) ),
		cert: fs.readFileSync( path.join( __dirname, 'fixtures/client-local-cert.pem' ) )
	}, listener ) : http.createServer( listener );
	server.on( 'connection', socket =>
	{
		sockets.add( socket );
		socket.on( 'close', () => sockets.delete( socket ) );
	} );
	server.on( 'tlsClientError', () => {} );
	await new Promise( resolve => server.listen( 0, '127.0.0.1', resolve ) );
	t.after( async () =>
	{
		for( const socket of sockets ) socket.destroy();
		await new Promise( resolve => server.close( resolve ) );
		if( failures.length ) throw failures[0];
	} );
	return { url: `${secure ? 'https' : 'http'}://127.0.0.1:${server.address().port}`, requests };
}

function deadlineClock()
{
	const pending = new Map();
	let cleared = 0;
	return {
		pending,
		get cleared() { return cleared; },
		timers: {
			setTimeout( callback, delay )
			{
				const handle = { unref() { return this; } };
				pending.set( handle, { callback, delay } );
				return handle;
			},
			clearTimeout( handle ) { if( pending.delete( handle ) ) cleared++; }
		},
		fire()
		{
			assert.equal( pending.size, 1 );
			const [ handle, timer ] = [ ...pending.entries() ][0];
			assert.equal( timer.delay, 30000 );
			pending.delete( handle );
			timer.callback();
		}
	};
}

test( 'official PBKDF2 and legacy MD5 authentication vectors', async () =>
{
	const { CreateChallengeResponse } = clientModule();
	assert.equal( await CreateChallengeResponse( '2$10000$5A1711$2000$5A1722', '1example!' ),
		'5A1722$1798a1672bca7c6463d6b245f82b53703b0f50813401b03e4045a5861e689adb' );
	assert.equal( await CreateChallengeResponse( '1234567z', 'äbc' ),
		'1234567z-9e224a41eeefa284df7bb0f26c2913e2' );
	const expected = createHash( 'md5' ).update( Buffer.from( 'nonce-..', 'utf16le' ) ).digest( 'hex' );
	assert.equal( await CreateChallengeResponse( 'nonce', 'ā😀' ), 'nonce-' + expected );
	const first = pbkdf2Sync( Buffer.from( 'ä😀', 'utf8' ), Buffer.from( 'AA', 'hex' ), 1, 32, 'sha256' );
	const unicode = pbkdf2Sync( first, Buffer.from( 'BB', 'hex' ), 2, 32, 'sha256' ).toString( 'hex' );
	assert.equal( await CreateChallengeResponse( '2$1$AA$2$BB', 'ä😀' ), 'BB$' + unicode );
} );

test( 'malformed PBKDF2 challenge fields are rejected', async () =>
{
	const { CreateChallengeResponse } = clientModule();
	for( const challenge of [ '', '2$', '2$0$AA$1$BB', '2$1.5$AA$1$BB',
		'2$1$A$1$BB', '2$1$GG$1$BB', '2$1$AA$NaN$BB', '2$1$AA$1$BB$extra' ] )
	{
		await assert.rejects( Promise.resolve().then( () => CreateChallengeResponse( challenge, 'password' ) ),
			error => error.code === 'EPROTO', challenge );
	}
} );

test( 'a valid initial SID works without a challenge and normalizes trailing slashes', async t =>
{
	const f = await router( t, ( request, response ) =>
	{
		if( request.path === '/login_sid.lua' ) send( response, session() );
		else send( response, JSON.stringify( { data: { dect: { enabled: false }, fritzos: '8.20' } } ) );
	} );
	const { FritzboxClient } = clientModule();
	const client = new FritzboxClient( 'unused', 'unused', f.url + '///' );
	await client.login();
	assert.deepEqual( plain( await client.getFritzboxOverview() ),
		{ data: { dect: { enabled: false }, fritzos: '8.20' } } );
	assert.deepEqual( f.requests.map( request => [ request.method, request.path ] ),
		[ [ 'GET', '/login_sid.lua' ], [ 'POST', '/data.lua' ] ] );
	assert.deepEqual( f.requests[0].query, { version: '2' } );
	assert.deepEqual( f.requests[1].form, { sid: SID, xhr: '1' } );
} );

for( const [ username, challenge ] of [ [ '', 'noncez' ], [ 'a+b&=/? ü', '2$1$AA$2$BB' ] ] )
{
	test( `login form encodes credentials and preserves ${username === '' ? 'an empty' : 'a special-character'} username`, async t =>
	{
		const password = 'p+&= ä😀';
		const { FritzboxClient, CreateChallengeResponse } = clientModule();
		const expected = await CreateChallengeResponse( challenge, password );
		const f = await router( t, ( request, response ) =>
		{
			if( request.method === 'GET' ) send( response, session( ZERO_SID, challenge ) );
			else send( response, session() );
		} );
		await new FritzboxClient( username, password, f.url ).login();
		assert.equal( f.requests.length, 2 );
		assert.deepEqual( f.requests[1].query, { version: '2' } );
		assert.equal( f.requests[1].path, '/login_sid.lua' );
		assert.equal( f.requests[1].form.username, username );
		assert.equal( f.requests[1].form.response, expected );
		assert.match( f.requests[1].headers['content-type'], /application\/x-www-form-urlencoded/ );
		assert.ok( !f.requests[1].body.includes( password ) );
	} );
}

test( 'router BlockTime is awaited before submitting the login response', async t =>
{
	const blocked = deferred();
	const enteredBlock = deferred();
	const waits = [];
	const f = await router( t, ( request, response ) =>
	{
		if( request.method === 'GET' ) send( response, session( ZERO_SID, 'nonce', 7 ) );
		else send( response, session() );
	} );
	const { FritzboxClient } = clientModule( { 'node:timers/promises': {
		setTimeout: delay => { waits.push( delay ); enteredBlock.resolve(); return blocked.promise; }
	} } );
	const login = new FritzboxClient( 'user', 'password', f.url ).login();
	await enteredBlock.promise;
	assert.deepEqual( waits, [ 7000 ] );
	assert.equal( f.requests.length, 1 );
	blocked.resolve();
	await login;
	assert.equal( f.requests.length, 2 );
} );

test( 'malformed session documents remain protocol errors before and after authentication', async t =>
{
	const { FritzboxClient } = clientModule();
	for( const document of [ '<SessionInfo>', '<wrong><SID>' + SID + '</SID></wrong>',
		'<SessionInfo><SID>abc</SID></SessionInfo>', session( 'zzzzzzzzzzzzzzzz' ),
		session( ZERO_SID ), session( ZERO_SID, 'nonce', 'invalid' ) ] )
	{
		const f = await router( t, ( request, response ) => send( response, document ) );
		await assert.rejects( new FritzboxClient( 'user', 'password', f.url ).login(),
			error => error.code === 'EPROTO' );
		assert.equal( f.requests.length, 1 );
	}
	const f = await router( t, ( request, response ) =>
		send( response, request.method === 'GET' ? session( ZERO_SID, 'nonce' ) : '<SessionInfo><SID>invalid</SID></SessionInfo>' ) );
	await assert.rejects( new FritzboxClient( 'user', 'password', f.url ).login(), error => error.code === 'EPROTO' );
} );

test( 'rejected credentials are distinct and a subsequent explicit login can succeed', async t =>
{
	let postCount = 0;
	const f = await router( t, ( request, response ) =>
	{
		if( request.method === 'GET' ) send( response, session( ZERO_SID, 'nonce' ) );
		else send( response, session( ++postCount === 1 ? ZERO_SID : SID ) );
	} );
	const { FritzboxClient } = clientModule();
	const client = new FritzboxClient( 'user', 'password', f.url );
	await assert.rejects( client.login(), error => error.code === 'EAUTH' );
	await client.login();
	assert.equal( postCount, 2 );
} );

test( 'concurrent first requests share one authentication', async t =>
{
	const initial = deferred();
	let initialResponse;
	const f = await router( t, ( request, response ) =>
	{
		if( request.path === '/login_sid.lua' && request.method === 'GET' )
		{
			initialResponse = response;
			initial.resolve();
		}
		else if( request.path === '/login_sid.lua' ) send( response, session() );
		else if( request.path === '/data.lua' ) send( response, '{"data":{"active":[]}}' );
		else send( response, '<devicelist/>' );
	} );
	const { FritzboxClient } = clientModule();
	const client = new FritzboxClient( 'user', 'password', f.url );
	const calls = [ client.getDeviceList(), client.getFritzboxOverview(), client.getFritzboxNetwork(), client.login() ];
	await initial.promise;
	assert.equal( f.requests.length, 1 );
	send( initialResponse, session( ZERO_SID, 'nonce' ) );
	await Promise.all( calls );
	assert.equal( f.requests.filter( request => request.path === '/login_sid.lua' ).length, 2 );
	assert.equal( f.requests.filter( request => request.path !== '/login_sid.lua' ).length, 3 );
} );

test( 'concurrent expired-session responses share one renewal', async t =>
{
	const expiredResponses = [];
	const bothExpired = deferred();
	let logins = 0;
	const f = await router( t, ( request, response ) =>
	{
		if( request.path === '/login_sid.lua' ) send( response, session( ++logins === 1 ? SID : NEW_SID ) );
		else if( request.query.sid === SID )
		{
			expiredResponses.push( response );
			if( expiredResponses.length === 2 ) bothExpired.resolve();
		}
		else send( response, '<devicelist/>' );
	} );
	const { FritzboxClient } = clientModule();
	const client = new FritzboxClient( 'user', 'password', f.url );
	await client.login();
	const calls = [ client.getDeviceList(), client.getDeviceList() ];
	await bothExpired.promise;
	for( const response of expiredResponses ) send( response, 'expired', 403 );
	await Promise.all( calls );
	assert.equal( logins, 2 );
	assert.equal( f.requests.filter( request => request.query.sid === NEW_SID ).length, 2 );
} );

test( 'an obsolete SID failure cannot discard a newer successful session', async t =>
{
	const expiredResponses = new Map();
	const bothExpired = deferred();
	let logins = 0;
	const f = await router( t, ( request, response ) =>
	{
		if( request.path === '/login_sid.lua' ) send( response, session( ++logins === 1 ? SID : NEW_SID ) );
		else if( request.query.sid === SID )
		{
			expiredResponses.set( request.query.ain, response );
			if( expiredResponses.size === 2 ) bothExpired.resolve();
		}
		else send( response, '1' );
	} );
	const { FritzboxClient } = clientModule();
	const client = new FritzboxClient( 'user', 'password', f.url );
	await client.login();
	const first = client.setSwitchOn( 'first' );
	const second = client.setSwitchOn( 'second' );
	await bothExpired.promise;
	send( expiredResponses.get( 'first' ), 'expired', 403 );
	await first;
	send( expiredResponses.get( 'second' ), 'late expired response', 403 );
	await second;
	await client.setSwitchOn( 'third' );
	assert.equal( logins, 2 );
	assert.equal( f.requests.filter( request => request.query.sid === NEW_SID ).length, 3 );
} );

for( const failure of [ '403', 'login form', 'login redirect' ] )
{
	test( `${failure} permits exactly one session renewal and replay`, async t =>
	{
		let logins = 0;
		let actions = 0;
		const f = await router( t, ( request, response ) =>
		{
			if( request.path === '/login_sid.lua' ) send( response, session( ++logins === 1 ? SID : NEW_SID ) );
			else
			{
				actions++;
				send( response, failure === '403' ? 'permission denied' : failure === 'login form' ? LOGIN_HTML : '',
					failure === '403' ? 403 : failure === 'login form' ? 200 : 302,
					failure === 'login redirect' ? { Location: '/login.lua' } : {} );
			}
		} );
		const { FritzboxClient } = clientModule();
		await assert.rejects( new FritzboxClient( 'user', 'password', f.url ).setSwitchOn( 'ain' ),
			error => error.code === 403 );
		assert.equal( logins, 2 );
		assert.equal( actions, 2 );
	} );
}

test( 'a login form response renews the shared data.lua session', async t =>
{
	let logins = 0;
	const f = await router( t, ( request, response ) =>
	{
		if( request.path === '/login_sid.lua' ) send( response, session( ++logins === 1 ? SID : NEW_SID ) );
		else send( response, request.form.sid === SID ? LOGIN_HTML : '{"data":{"fritzos":"8.20"}}' );
	} );
	const { FritzboxClient } = clientModule();
	assert.deepEqual( plain( await new FritzboxClient( 'user', 'password', f.url ).getFritzboxOverview() ),
		{ data: { fritzos: '8.20' } } );
	assert.equal( logins, 2 );
	assert.equal( f.requests.filter( request => request.path === '/data.lua' ).length, 2 );
} );

test( 'HTTP 401 permission failures do not trigger authentication or replay', async t =>
{
	const f = await router( t, ( request, response ) =>
		send( response, request.path === '/login_sid.lua' ? session() : 'permission denied',
			request.path === '/login_sid.lua' ? 200 : 401 ) );
	const { FritzboxClient } = clientModule();
	await assert.rejects( new FritzboxClient( 'user', 'password', f.url ).setSwitchOn( 'ain' ), error => error.code === 401 );
	assert.equal( f.requests.length, 2 );
} );

for( const status of [ 401, 503 ] )
{
	test( `HTTP ${status} containing a login form preserves status without replaying an actuator`, async t =>
	{
		const f = await router( t, ( request, response ) =>
			send( response, request.path === '/login_sid.lua' ? session() : LOGIN_HTML,
				request.path === '/login_sid.lua' ? 200 : status,
				{ 'Content-Type': request.path === '/login_sid.lua' ? 'text/xml' : 'text/html' } ) );
		const { FritzboxClient } = clientModule();
		await assert.rejects( new FritzboxClient( 'user', 'password', f.url ).setSwitchOn( 'ain' ), error => error.code === status );
		assert.equal( f.requests.length, 2 );
	} );
}

test( 'AHA inval alone never triggers authentication or replay', async t =>
{
	const f = await router( t, ( request, response ) =>
		send( response, request.path === '/login_sid.lua' ? session() : 'inval' ) );
	const { FritzboxClient } = clientModule();
	await new FritzboxClient( 'user', 'password', f.url ).setSwitchOn( 'ain' ).catch( () => {} );
	assert.equal( f.requests.length, 2 );
} );

for( const operation of [ 'setSwitchOn', 'applyTemplate' ] )
{
	for( const failure of [ 'reset', '503', 'malformed response' ] )
	{
		test( `${operation} is never replayed after ${failure}`, async t =>
		{
			const f = await router( t, ( request, response ) =>
			{
				if( request.path === '/login_sid.lua' ) send( response, session() );
				else if( failure === 'reset' ) response.destroy();
				else if( failure === '503' ) send( response, 'temporarily unavailable', 503 );
				else send( response, operation === 'setSwitchOn' ? 'not-a-number' : '<html><body>Maintenance</body></html>' );
			} );
			const { FritzboxClient } = clientModule();
			const expected = failure === 'reset' ? 'ECONNRESET' : failure === '503' ? 503 : 'EPROTO';
			await assert.rejects( new FritzboxClient( 'user', 'password', f.url )[operation]( 'ain' ), error => error.code === expected );
			assert.equal( f.requests.length, 2 );
		} );
	}
}

test( 'malformed data.lua JSON and unrelated HTML do not become successful empty responses', async t =>
{
	const { FritzboxClient } = clientModule();
	for( const body of [ '{"data":', '<html><body>Maintenance</body></html>', 'null', '[]', '{}', '{"data":[]}' ] )
	{
		const f = await router( t, ( request, response ) =>
			send( response, request.path === '/login_sid.lua' ? session() : body ) );
		await assert.rejects( new FritzboxClient( 'user', 'password', f.url ).getFritzboxOverview(),
			error => error.code === 'EPROTO' );
		assert.equal( f.requests.length, 2 );
	}
} );

test( 'HTTP redirects are rejected without accepting a redirected document', async t =>
{
	const f = await router( t, ( request, response ) =>
	{
		if( request.path === '/login_sid.lua' ) send( response, session() );
		else send( response, '', 302, { Location: '/maintenance.html' } );
	} );
	const { FritzboxClient } = clientModule();
	await assert.rejects( new FritzboxClient( 'user', 'password', f.url ).getDeviceList(), error => error.code === 302 );
	assert.equal( f.requests.length, 2 );
} );

test( 'all used commands use encoded AINs, documented parameters, and compatible return values', async t =>
{
	const f = await router( t, ( request, response ) =>
	{
		if( request.path === '/login_sid.lua' ) send( response, session() );
		else if( request.query.switchcmd === 'getdevicelistinfos' ) send( response, '<devicelist/>' );
		else if( request.query.switchcmd === 'gettemplatelistinfos' ) send( response, '<templatelist/>' );
		else if( [ 'applytemplate', 'setblind' ].includes( request.query.switchcmd ) ) send( response, 'accepted' );
		else if( request.query.switchcmd === 'setcolor' ) send( response, '35' );
		else send( response, request.query.param ?? request.query.level ?? request.query.temperature ?? request.query.onoff ??
			( request.query.switchcmd === 'setswitchoff' ? '0' : '1' ) );
	} );
	const { FritzboxClient } = clientModule();
	const client = new FritzboxClient( 'user', 'password', f.url );
	const ain = '00123 456-1+&/?ü';
	assert.deepEqual( plain( await client.getDeviceList() ), [] );
	assert.deepEqual( plain( await client.getTemplates() ), [] );
	assert.equal( await client.applyTemplate( ain ), 'accepted' );
	assert.equal( await client.setSwitchOn( ain ), 1 );
	assert.equal( await client.setSwitchOff( ain ), 0 );
	assert.equal( await client.setTempTarget( ain, 21.3 ), 21.3 );
	assert.equal( await client.setTempTarget( ain, true ), true );
	assert.equal( await client.setTempTarget( ain, 'off' ), 'off' );
	assert.equal( await client.setSimpleOnOff( ain, 'on' ), 'on' );
	assert.equal( await client.setSimpleOnOff( ain, 'toggle' ), 'toggle' );
	await client.setLevelPercentage( ain, -5 );
	await client.setLevelPercentage( ain, 105 );
	assert.equal( await client.setColor( ain, 'orange', 140, 500 ), 'orange' );
	assert.equal( await client.setColor( ain, 'orange', 72, 0 ), 'orange' );
	assert.equal( await client.setColorTemperature( ain, 3400, 500 ), 3400 );
	assert.equal( await client.setBlind( ain, 'open' ), 'open' );
	assert.equal( await client.setBlind( ain, 'close' ), 'close' );
	assert.equal( await client.setBlind( ain, 'stop' ), 'stop' );
	const commands = f.requests.slice( 1 );
	const expected = [
		{ switchcmd: 'getdevicelistinfos' }, { switchcmd: 'gettemplatelistinfos' },
		{ switchcmd: 'applytemplate', ain }, { switchcmd: 'setswitchon', ain }, { switchcmd: 'setswitchoff', ain },
		{ switchcmd: 'sethkrtsoll', ain, param: '43' }, { switchcmd: 'sethkrtsoll', ain, param: '254' },
		{ switchcmd: 'sethkrtsoll', ain, param: '253' }, { switchcmd: 'setsimpleonoff', ain, onoff: '1' },
		{ switchcmd: 'setsimpleonoff', ain, onoff: '2' }, { switchcmd: 'setlevelpercentage', ain, level: '0' },
		{ switchcmd: 'setlevelpercentage', ain, level: '100' },
		{ switchcmd: 'setcolor', ain, hue: '35', saturation: '140', duration: '500' },
		{ switchcmd: 'setcolor', ain, hue: '35', saturation: '72', duration: '0' },
		{ switchcmd: 'setcolortemperature', ain, temperature: '3400', duration: '500' },
		{ switchcmd: 'setblind', ain, target: 'open' }, { switchcmd: 'setblind', ain, target: 'close' },
		{ switchcmd: 'setblind', ain, target: 'stop' }
	];
	assert.deepEqual( commands.map( request => request.query ), expected.map( query => ( { sid: SID, ...query } ) ) );
	assert.ok( commands.every( request => request.method === 'GET' && request.path === '/webservices/homeautoswitch.lua' ) );
} );

test( 'thermostat conversions preserve clamping, half-degree rounding and special values', () =>
{
	const { FritzboxClient } = clientModule();
	assert.equal( FritzboxClient.MIN_TEMP, 8 );
	assert.equal( FritzboxClient.MAX_TEMP, 28 );
	for( const [ value, expected ] of [ [ -100, 16 ], [ 100, 56 ], [ 21.2, 42 ], [ 21.3, 43 ],
		[ 'on', 254 ], [ true, 254 ], [ 'off', 253 ], [ false, 253 ] ] )
	{
		assert.equal( FritzboxClient.Temp2Api( value ), expected );
	}
	assert.equal( FritzboxClient.Api2Temp( 43 ), 21.5 );
	assert.equal( FritzboxClient.Api2Temp( 254 ), 'on' );
	assert.equal( FritzboxClient.Api2Temp( 253 ), 'off' );
	for( const value of [ NaN, Infinity, -Infinity, 'invalid' ] ) assert.throws( () => FritzboxClient.Temp2Api( value ) );
} );

test( 'all fixed colors preserve absolute saturation and use their documented hue', async t =>
{
	const f = await router( t, ( request, response ) =>
		send( response, request.path === '/login_sid.lua' ? session() : '1' ) );
	const { FritzboxClient } = clientModule();
	const client = new FritzboxClient( 'user', 'password', f.url );
	for( const [ color, hue ] of [ [ 'orange', 35 ], [ 'yellow', 52 ], [ 'lime', 92 ], [ 'green', 107 ],
		[ 'turquoise', 155 ], [ 'cyan', 191 ], [ 'lightblue', 218 ], [ 'blue', 225 ],
		[ 'purple', 266 ], [ 'magenta', 296 ], [ 'pink', 335 ], [ 'red', 358 ] ] )
	{
		await client.setColor( 'ain', color, 51, 7 );
		assert.equal( f.requests.at( -1 ).query.hue, String( hue ) );
		assert.equal( f.requests.at( -1 ).query.saturation, '51' );
		assert.equal( f.requests.at( -1 ).query.duration, '7' );
	}
} );

test( 'invalid numeric actuator values fail before making any request', async t =>
{
	const f = await router( t, ( request, response ) => send( response, session() ) );
	const { FritzboxClient } = clientModule();
	const client = new FritzboxClient( 'user', 'password', f.url );
	for( const value of [ NaN, Infinity, -Infinity ] )
	{
		const commands = [
			() => client.setTempTarget( 'ain', value ), () => client.setSimpleOnOff( 'ain', value ),
			() => client.setLevelPercentage( 'ain', value ), () => client.setColor( 'ain', 'orange', value, 0 ),
			() => client.setColor( 'ain', 'orange', 140, value ), () => client.setColorTemperature( 'ain', value, 0 ),
			() => client.setColorTemperature( 'ain', 3400, value )
		];
		for( const command of commands ) await assert.rejects( Promise.resolve().then( command ) );
	}
	assert.equal( f.requests.length, 0 );
} );

test( 'overview and network share authentication and omit absent optional form fields', async t =>
{
	const overview = { data: { dect: false, fritzos: { version: '8.20' } } };
	const network = { data: { active: [ { name: 'Phone', ip: '192.168.178.20' } ] } };
	const f = await router( t, ( request, response ) =>
	{
		if( request.path === '/login_sid.lua' ) send( response, session() );
		else send( response, JSON.stringify( request.form.page === 'netDev' ? network : overview ) );
	} );
	const { FritzboxClient } = clientModule();
	const client = new FritzboxClient( 'user', 'password', f.url );
	assert.deepEqual( plain( await client.getFritzboxOverview() ), overview );
	assert.deepEqual( plain( await client.getFritzboxNetwork() ), network );
	assert.equal( f.requests.length, 3 );
	assert.deepEqual( f.requests[1].form, { sid: SID, xhr: '1' } );
	assert.deepEqual( f.requests[2].form, { sid: SID, xhr: '1', page: 'netDev', xhrId: 'cleanup' } );
	assert.ok( f.requests.slice( 1 ).every( request => request.method === 'POST' && request.path === '/data.lua' &&
		request.headers['content-type'].startsWith( 'application/x-www-form-urlencoded' ) ) );
} );

test( 'HTML fragments within valid JSON strings remain data', async t =>
{
	const overview = { data: { active: [ { name: '<html>', comment: "<form action='/login.lua'>" } ] } };
	const f = await router( t, ( request, response ) =>
		send( response, request.path === '/login_sid.lua' ? session() : JSON.stringify( overview ), 200,
			{ 'Content-Type': request.path === '/login_sid.lua' ? 'text/xml' : 'application/json' } ) );
	const { FritzboxClient } = clientModule();
	assert.deepEqual( plain( await new FritzboxClient( 'user', 'password', f.url ).getFritzboxOverview() ), overview );
	assert.equal( f.requests.length, 2 );
} );

test( 'HTML fragments within XML CDATA remain device text', async t =>
{
	const name = "<html><form action='/login.lua'>";
	const xml = '<devicelist><device identifier="00123 456-1"><name><![CDATA[' + name + ']]></name></device></devicelist>';
	const f = await router( t, ( request, response ) =>
		send( response, request.path === '/login_sid.lua' ? session() : xml, 200, { 'Content-Type': 'text/xml' } ) );
	const { FritzboxClient } = clientModule();
	const devices = await new FritzboxClient( 'user', 'password', f.url ).getDeviceList();
	assert.equal( devices[0].name, name );
	assert.equal( f.requests.length, 2 );
} );

test( 'direct client and API type imports preserve enums and execute their commands', async t =>
{
	const f = await router( t, ( request, response ) =>
	{
		if( request.path === '/login_sid.lua' ) send( response, session() );
		else send( response, request.path === '/data.lua' ? '{"data":{"active":[]}}' : '1' );
	} );
	const { FritzboxClient } = clientModule();
	const { FritzboxBitmask, FritzboxColor, FritzboxBlind } = loadTypescript( 'types/FritzboxTypes.ts' );
	const api = new FritzboxClient( 'user', 'password', f.url, false );
	assert.deepEqual( plain( await api.getFritzboxNetwork() ), { data: { active: [] } } );
	assert.equal( FritzboxClient.Temp2Api( 21.3 ), 43 );
	assert.equal( FritzboxBitmask.Outlet, 512 );
	assert.equal( FritzboxColor.Orange, 'orange' );
	assert.equal( FritzboxBlind.Stop, 'stop' );
	assert.equal( await api.setColor( 'color-device', FritzboxColor.Orange, 140, 500 ), 'orange' );
	assert.equal( await api.setBlind( 'blind-device', FritzboxBlind.Stop ), 'stop' );
	assert.deepEqual( f.requests.at( -2 ).query,
		{ sid: SID, switchcmd: 'setcolor', ain: 'color-device', hue: '35', saturation: '140', duration: '500' } );
	assert.deepEqual( f.requests.at( -1 ).query,
		{ sid: SID, switchcmd: 'setblind', ain: 'blind-device', target: 'stop' } );
} );

test( 'UTF-8 response bytes split inside a multibyte character are preserved', async t =>
{
	const f = await router( t, ( request, response ) =>
	{
		if( request.path === '/login_sid.lua' ) send( response, session() );
		else
		{
			const body = Buffer.from( '<devicelist><device identifier="00123 456-1"><name>Schräge 🔆</name></device></devicelist>' );
			const split = body.indexOf( Buffer.from( '🔆' ) ) + 1;
			response.write( body.subarray( 0, split ) );
			setImmediate( () => response.end( body.subarray( split ) ) );
		}
	} );
	const { FritzboxClient } = clientModule();
	const devices = await new FritzboxClient( 'user', 'password', f.url ).getDeviceList();
	assert.equal( devices[0].name, 'Schräge 🔆' );
	assert.equal( devices[0].identifier, '00123456-1' );
} );

test( 'HTTPS defaults to allowing router certificates, while strictssl is isolated per client', async t =>
{
	const f = await router( t, ( request, response ) => send( response, session() ), true );
	const originalTlsSetting = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
	const { FritzboxClient } = clientModule();
	await new FritzboxClient( 'user', 'password', f.url ).login();
	await assert.rejects( new FritzboxClient( 'user', 'password', f.url, true ).login(),
		error => error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' );
	await new FritzboxClient( 'user', 'password', f.url, false ).login();
	assert.equal( process.env.NODE_TLS_REJECT_UNAUTHORIZED, originalTlsSetting );
	assert.equal( f.requests.length, 2 );
} );

test( 'a successful response clears its deadline timer', async t =>
{
	const clock = deadlineClock();
	const f = await router( t, ( request, response ) => send( response, session() ) );
	const { FritzboxClient } = clientModule( { 'node:timers': clock.timers } );
	await new FritzboxClient( 'user', 'password', f.url ).login();
	assert.equal( clock.pending.size, 0 );
	assert.equal( clock.cleared, 1 );
} );

for( const failure of [ 'reset', '401', 'JSON parse rejection' ] )
{
	test( `${failure} clears all outstanding request deadline timers`, async t =>
	{
		const clock = deadlineClock();
		const f = await router( t, ( request, response ) =>
		{
			if( request.path === '/login_sid.lua' ) send( response, session() );
			else if( failure === 'reset' ) response.destroy();
			else if( failure === '401' ) send( response, 'permission denied', 401 );
			else send( response, '{"data":' );
		} );
		const { FritzboxClient } = clientModule( { 'node:timers': clock.timers } );
		const expected = failure === 'reset' ? 'ECONNRESET' : failure === '401' ? 401 : 'EPROTO';
		await assert.rejects( new FritzboxClient( 'user', 'password', f.url ).getFritzboxOverview(), error => error.code === expected );
		assert.equal( clock.pending.size, 0 );
		assert.equal( clock.cleared, 2 );
	} );
}

test( 'a deadline terminates stalled connection establishment and preserves ETIMEDOUT', async () =>
{
	const clock = deadlineClock();
	const entered = deferred();
	let request;
	const { FritzboxClient } = clientModule( {
		'node:timers': clock.timers,
		'node:http': { ...http, request()
		{
			request = new EventEmitter();
			request.write = () => {};
			request.end = () => entered.resolve();
			request.destroy = error =>
			{
				request.destroyed = true;
				queueMicrotask( () => error === undefined ? request.emit( 'close' ) : request.emit( 'error', error ) );
			};
			return request;
		} }
	} );
	const login = new FritzboxClient( 'user', 'password', 'http://stalled.invalid' ).login();
	const rejected = assert.rejects( login, error => error.code === 'ETIMEDOUT' );
	await entered.promise;
	clock.fire();
	await rejected;
	assert.equal( request.destroyed, true );
	assert.equal( clock.pending.size, 0 );
} );

test( 'a deadline terminates a stalled actuator body without renewal or replay', async t =>
{
	const clock = deadlineClock();
	const bodyStarted = deferred();
	const socketClosed = deferred();
	const f = await router( t, ( request, response, incoming ) =>
	{
		if( request.path === '/login_sid.lua' ) send( response, session() );
		else
		{
			incoming.socket.once( 'close', () => socketClosed.resolve() );
			response.writeHead( 200, { 'Content-Type': 'text/plain' } );
			response.write( '1' );
			bodyStarted.resolve();
		}
	} );
	const { FritzboxClient } = clientModule( { 'node:timers': clock.timers } );
	const client = new FritzboxClient( 'user', 'password', f.url );
	const action = client.setSwitchOn( 'ain' );
	const rejected = assert.rejects( action, error => error.code === 'ETIMEDOUT' );
	await bodyStarted.promise;
	await flush();
	clock.fire();
	await rejected;
	await socketClosed.promise;
	assert.equal( clock.pending.size, 0 );
	assert.equal( f.requests.length, 2 );
} );
