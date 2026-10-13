'use strict';
const fs = require( 'node:fs' );
const path = require( 'node:path' );
const vm = require( 'node:vm' );
const { EventEmitter } = require( 'node:events' );
const ts = require( 'typescript' );
const root = path.resolve( __dirname, '..' );

function loadTypescript( filename, replacements = {} )
{
	const cache = new Map();
	function load( absolute )
	{
		if( Object.hasOwn( replacements, absolute ) ) return replacements[absolute];
		if( cache.has( absolute ) ) return cache.get( absolute ).exports;
		const output = ts.transpileModule( fs.readFileSync( absolute, 'utf8' ), {
			compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
			fileName: absolute
		} ).outputText;
		const module = { exports: {} };
		cache.set( absolute, module );
		const localRequire = name =>
		{
			if( Object.hasOwn( replacements, name ) ) return replacements[name];
			if( !name.startsWith( '.' ) ) return require( name );
			const resolved = path.resolve( path.dirname( absolute ), name );
			return load( path.extname( resolved ) ? resolved : resolved + '.ts' );
		};
		const execute = vm.runInNewContext( '(function(require, module, exports) {' + output + '\n})',
			{ console: { debug() {}, error() {}, log() {} } }, { filename: absolute } );
		execute( localRequire, module, module.exports );
		return module.exports;
	}
	return load( path.resolve( root, filename ) );
}

function deferred()
{
	let resolve;
	let reject;
	const promise = new Promise( ( resolvePromise, rejectPromise ) =>
	{
		resolve = resolvePromise;
		reject = rejectPromise;
	} );
	return { promise, resolve, reject };
}
function flush() { return new Promise( resolve => setImmediate( resolve ) ); }

function createHomey( initial = {} )
{
	const homey = new EventEmitter();
	const values = new Map( Object.entries( initial ) );
	const settings = new EventEmitter();
	settings.get = key => values.get( key );
	settings.set = ( key, value ) =>
	{
		values.set( key, value );
		settings.emit( 'set', key );
	};
	settings.unset = key =>
	{
		values.delete( key );
		settings.emit( 'unset', key );
	};
	homey.settings = settings;
	homey.logs = [];
	homey.errors = [];
	homey.log = ( ...args ) => homey.logs.push( args );
	homey.error = ( ...args ) => homey.errors.push( args );
	homey.__ = key => key;
	homey.drivers = { getDriver: () => ( { getDevices: () => [] } ) };
	let clock = 0;
	let timerId = 0;
	const timers = new Map();
	homey.setTimeout = ( callback, delay ) =>
	{
		const handle = ++timerId;
		timers.set( handle, { callback, delay, due: clock + delay } );
		return handle;
	};
	homey.clearTimeout = handle => timers.delete( handle );
	homey.timers = timers;
	homey.runNextTimer = () =>
	{
		const next = [ ...timers.entries() ].sort( ( left, right ) => left[1].due - right[1].due )[0];
		if( next === undefined ) throw new Error( 'No pending timer' );
		const [ handle, timer ] = next;
		timers.delete( handle );
		clock = timer.due;
		timer.callback();
		return timer.delay;
	};
	return homey;
}

async function createApp( initial = {} )
{
	const homey = createHomey( {
		username: 'first-user', password: 'first-password', fritzboxip: 'http://fritz.box', ...initial
	} );
	let manager;
	class MockManager
	{
		constructor()
		{
			manager = this;
			this.connections = [];
			this.updated = [];
			this.pollingStarted = [];
			this.pollingStopped = 0;
		}
		Connect( username, password, url, strictSSL )
		{
			const connection = { username, password, url, strictSSL, requests: [], overviewRequests: [] };
			connection.login = () =>
			{
				const request = deferred();
				connection.requests.push( request );
				return request.promise.then( result => { connection.overview = result; } );
			};
			connection.getFritzboxOverview = () =>
			{
				connection.overviewRequests.push( true );
				if( connection.overviewError ) return Promise.reject( connection.overviewError );
				return connection.overviewPromise ?? Promise.resolve( connection.overview );
			};
			this.connections.push( connection );
			this.api = connection;
		}
		GetApi() { return this.api; }
		StopPolling() { this.pollingStopped++; }
		async StartPolling( interval )
		{
			this.pollingStarted.push( interval );
			if( this.pollingError ) throw this.pollingError;
		}
		async updateFritzboxData( result )
		{
			this.updated.push( result );
			if( this.updatePromise ) await this.updatePromise;
			if( this.updateError ) throw this.updateError;
		}
	}
	const App = loadTypescript( 'app.ts', {
		homey: { App: class { constructor() { this.homey = homey; } } },
		[ path.resolve( root, 'lib/FritzboxManager.ts' ) ]: { FritzboxManager: MockManager }
	} );
	const app = new App();
	homey.app = app;
	await app.onInit();
	return {
		app, homey, manager,
		request: () => manager.api.requests.at( -1 ),
		runTimer: async () =>
		{
			const delay = homey.runNextTimer();
			await flush();
			return delay;
		}
	};
}
module.exports = { root, loadTypescript, deferred, flush, createHomey, createApp };
