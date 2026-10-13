'use strict';
const assert = require( 'node:assert/strict' );
const test = require( 'node:test' );
const fs = require( 'node:fs' );
const path = require( 'node:path' );
const vm = require( 'node:vm' );
const { root, flush } = require( './helpers.cjs' );

function browser( initial = {}, loading = {} )
{
	const values = { username: 'user', password: 'password', fritzboxip: 'fritz.box', strictssl: false,
		pollinginterval: 60, request_smarthome: true, request_network: true,
		showunconnected: false, allowmultiple: false, skipdectcheck: false,
		validation: 0, validationInfo: 'Message.Timeout', ...initial };
	const elements = {};
	for( const id of [ 'save', 'status', 'debug', 'username', 'password', 'fritzboxip', 'strictssl',
		'pollinginterval', 'request_smarthome', 'request_network', 'showunconnected', 'allowmultiple', 'skipdectcheck' ] )
	{
		elements[id] = { value: '', checked: false, disabled: false, innerText: '',
			classList: { add() {}, remove() {} },
			addEventListener( name, listener ) { this[name] = listener; } };
	}
	const listeners = {};
	const calls = [];
	const writes = [];
	const alerts = [];
	const timers = new Map();
	const heldReads = [];
	const heldLoads = [];
	let timerId = 0;
	const fixture = { values, elements, calls, writes, alerts, timers, heldReads, heldLoads };
	const Homey = {
		__: key => key, ready() {}, alert: error => alerts.push( error ),
		on: ( name, listener ) => { listeners[name] = listener; },
		get( key, callback )
		{
			if( loading.fail === key ) callback( new Error( 'settings unavailable' ) );
			else if( loading.defer === key ) heldLoads.push( callback );
			else if( fixture.hold === key ) heldReads.push( callback );
			else callback( null, values[key] );
		},
		set( key, value, callback )
		{
			writes.push( key );
			values[key] = value;
			callback( null );
		},
		api( method, endpoint, body, callback ) { calls.push( { method, endpoint, body, callback } ); }
	};
	fixture.update = ( key, value ) =>
	{
		values[key] = value;
		listeners['settings.set']( key );
	};
	const page = fs.readFileSync( path.join( root, 'settings/index.html' ), 'utf8' );
	const setup = page.match( /<script type="text\/javascript">([\s\S]*?)<\/script>/ )[1];
	vm.runInNewContext( fs.readFileSync( path.join( root, 'settings/helper.js' ), 'utf8' )
		+ '\n' + setup + '\nonHomeyReady(Homey);', {
		Homey, document: { getElementById: id => elements[id] },
		console: { log() {}, error() {}, debug() {} },
		setTimeout( callback, delay ) { const id = ++timerId; timers.set( id, { callback, delay } ); return id; },
		clearTimeout: id => timers.delete( id )
	} );
	return fixture;
}

test( 'saving unchanged credentials still requests a login retry', async () =>
{
	const f = browser();
	const saved = f.elements.save.click();
	await flush();
	assert.equal( f.calls.length, 1 );
	assert.equal( f.calls[0].method, 'POST' );
	assert.equal( f.calls[0].endpoint, '/retry-login' );
	assert.equal( f.calls[0].body.settings.username, 'user' );
	assert.equal( f.calls[0].body.settings.password, 'password' );
	assert.equal( f.writes.length, 0 );
	f.calls[0].callback( null, true );
	await saved;
	assert.equal( f.elements.save.disabled, false );
} );

test( 'changed credentials are sent together without separate browser settings writes', async () =>
{
	const f = browser();
	f.elements.username.value = 'corrected-user';
	f.elements.password.value = 'corrected-password';
	f.elements.fritzboxip.value = '192.168.178.1';
	const saved = f.elements.save.click();
	await flush();
	assert.equal( f.calls.length, 1 );
	const settings = f.calls[0].body.settings;
	assert.equal( settings.username, 'corrected-user' );
	assert.equal( settings.password, 'corrected-password' );
	assert.equal( settings.fritzboxip, '192.168.178.1' );
	assert.equal( f.writes.length, 0 );
	f.calls[0].callback( null, true );
	await saved;
} );

test( 'credentials can be corrected while an older login is still pending', async () =>
{
	const f = browser( { validation: 2, validationInfo: 'Message.InvalidLogin' } );
	await flush();
	assert.equal( f.elements.status.innerText, 'Message.LoginChecking' );
	assert.equal( f.elements.save.disabled, false );
	f.elements.password.value = 'corrected-password';
	const saved = f.elements.save.click();
	await flush();
	assert.equal( f.calls[0].body.settings.password, 'corrected-password' );
	assert.equal( f.elements.save.disabled, true );
	f.calls[0].callback( null, true );
	await saved;
	assert.equal( f.elements.save.disabled, false );
	assert.equal( f.elements.status.innerText, 'Message.LoginChecking' );
} );

test( 'validation events do not re-enable Save before persistence has completed', async () =>
{
	const f = browser();
	const saved = f.elements.save.click();
	await flush();
	f.update( 'validation', 1 );
	assert.equal( f.elements.save.disabled, true );
	f.calls[0].callback( null, true );
	await saved;
	assert.equal( f.elements.save.disabled, false );
	assert.equal( f.elements.status.innerText, 'Message.ValidLogin' );
} );

test( 'failed save reports the error and permits retrying the same inputs', async () =>
{
	const f = browser();
	f.elements.password.value = 'corrected-password';
	const saved = f.elements.save.click();
	await flush();
	f.calls[0].callback( new Error( 'save failed' ) );
	await saved;
	assert.equal( f.alerts.length, 1 );
	assert.equal( f.elements.save.disabled, false );
	const retry = f.elements.save.click();
	await flush();
	assert.equal( f.calls[1].body.settings.password, 'corrected-password' );
	f.calls[1].callback( null, true );
	await retry;
} );

test( 'pending status uses one timer and shows the actual eventual error', async () =>
{
	const f = browser( { validation: 2 } );
	await flush();
	for( let i = 0; i < 5; i++ ) f.update( 'validation', 2 );
	assert.equal( f.timers.size, 1 );
	f.update( 'validationInfo', 'Message.AccessForbidden' );
	f.update( 'validation', 0 );
	assert.equal( f.timers.size, 0 );
	assert.equal( f.elements.status.innerText, 'Message.AccessForbidden' );
	assert.equal( f.elements.save.disabled, false );
} );

test( 'an obsolete status read cannot replace the latest successful login', () =>
{
	const f = browser();
	f.hold = 'validation';
	f.update( 'validation', 0 );
	const older = f.heldReads.pop();
	f.hold = undefined;
	f.update( 'validation', 1 );
	older( null, 0 );
	assert.equal( f.elements.status.innerText, 'Message.ValidLogin' );
} );

test( 'an obsolete error-detail read cannot replace the latest successful login', () =>
{
	const f = browser();
	f.hold = 'validationInfo';
	f.update( 'validation', 0 );
	const older = f.heldReads.pop();
	f.hold = undefined;
	f.update( 'validation', 1 );
	older( null, 'Message.InvalidLogin' );
	assert.equal( f.elements.status.innerText, 'Message.ValidLogin' );
} );

test( 'missing validation error details show a useful fallback', () =>
{
	const f = browser( { validationInfo: undefined } );
	assert.equal( f.elements.status.innerText, 'Message.ErrorLogin' );
} );

test( 'the whole form is sent once, including unchanged preferences and typed numbers', async () =>
{
	const f = browser();
	f.elements.password.value = 'corrected-password';
	f.elements.pollinginterval.value = '120';
	f.elements.request_network.checked = false;
	f.elements.showunconnected.checked = true;
	const saved = f.elements.save.click();
	await flush();
	assert.equal( f.calls.length, 1 );
	assert.equal( f.writes.length, 0 );
	const settings = f.calls[0].body.settings;
	assert.deepEqual( Object.keys( settings ).sort(), [ 'username', 'password', 'fritzboxip', 'strictssl',
		'pollinginterval', 'request_smarthome', 'request_network', 'showunconnected', 'allowmultiple', 'skipdectcheck' ].sort() );
	assert.equal( settings.pollinginterval, 120 );
	assert.equal( settings.request_network, false );
	assert.equal( settings.showunconnected, true );
	assert.equal( settings.request_smarthome, true );
	assert.equal( settings.allowmultiple, false );
	assert.equal( settings.skipdectcheck, false );
	f.calls[0].callback( null, true );
	await saved;
} );

test( 'saving waits for initial values before collecting the complete form', async () =>
{
	const f = browser( { password: 'stored-password' }, { defer: 'password' } );
	assert.equal( f.elements.save.disabled, true );
	const saved = f.elements.save.click();
	await flush();
	assert.equal( f.calls.length, 0 );
	f.heldLoads[0]( null, 'stored-password' );
	await flush();
	assert.equal( f.calls[0].body.settings.password, 'stored-password' );
	assert.equal( f.calls[0].body.settings.pollinginterval, 60 );
	f.calls[0].callback( null, true );
	await saved;
} );

test( 'an initial read failure prevents saving a partial form and explains recovery', async () =>
{
	const f = browser( {}, { fail: 'password' } );
	await flush();
	assert.equal( f.elements.save.disabled, true );
	assert.equal( f.calls.length, 0 );
	assert.deepEqual( f.alerts, [ 'Message.LoadSettingsFailed' ] );
} );

test( 'a failed whole-form save retains preference inputs for the next attempt', async () =>
{
	const f = browser();
	f.elements.pollinginterval.value = '120';
	f.elements.request_network.checked = false;
	const saved = f.elements.save.click();
	await flush();
	f.calls[0].callback( new Error( 'save failed' ) );
	await saved;
	assert.equal( f.elements.pollinginterval.value, '120' );
	assert.equal( f.elements.request_network.checked, false );
	const retry = f.elements.save.click();
	await flush();
	assert.equal( f.calls[1].body.settings.pollinginterval, 120 );
	assert.equal( f.calls[1].body.settings.request_network, false );
	assert.equal( f.writes.length, 0 );
	f.calls[1].callback( null, true );
	await retry;
} );
