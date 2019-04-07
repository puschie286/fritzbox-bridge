'use strict';

const Homey = require('homey');
const Logger = require( 'js-logger' );

// define logger constants
Logger.SIMPLE_LOG = 'nl.nielsdeklerk.log';

Logger.init = function( systemLogger, logLevel, options )
{
	// init logger arrays & option variables
	this.ApiRegister = [];
	this.LoggerList = [];
	this.SystemLogger = systemLogger;
	this.SystemCopy = options.systemcopy !== undefined ? options.systemcopy : true;

	// set log-filter level
	this.setLevel( logLevel !== undefined ? logLevel : this.TRACE );

	// setup proxy handle
	this.setHandler( function( message, level )
	{
		// format message & level
		let Message = '[' + level.level.name + '] ' + message[0];

		// check available logger
		if( this.LoggerList.length === 0 )
		{
			// only system logger available
			this.SystemLogger( Message );
			return;
		}

		// check for option flag
		if( this.SystemCopy )
		{
			this.SystemLogger( Message );
		}

		// redirect to highest logger
		this.LoggerList[this.LoggerList.length-1].log( Message );
	}.bind( this ) );

	// setup listening for supported loggers
	this.listen( this.SIMPLE_LOG, 'Simple-LOG' );
};

/**
 * Custom implementation for external homey-app logger
 *
 * @param ID        homey app id
 */
Logger.loggerInstalled = function( ID )
{
	switch( ID )
	{
		case this.SIMPLE_LOG:
			this.LoggerList.push({
				id: this.SIMPLE_LOG,
				log: function( message )
				{
					// log message to SIMPLE_LOG api /addlog/
					this.ApiRegister[ID].put( '/addlog/', { log: message, group: 'fritz-bridge' } )
						.then(function() {} )
						.catch( function( error )
					{
						// log errors to system log
						this.SystemLogger( 'failed to log: ' + error );

						// pass message system logger if not done already
						if( this.SystemCopy ) return;
						this.SystemLogger( message );
					}.bind( this ) );
				}.bind( this )
			});
			return;
	}

	Logger.debug( '(install)invalid logger ID - not found' + ID );
};

Logger.loggerUninstalled = function( ID )
{
	if( this.LoggerList.length === 0 )
	{
		Logger.debug( '(uninstall)invalid logger ID - logger list is empty' );
		return;
	}

	// search for logger ID
	let Target = null;
	this.LoggerList.some( function( value, index )
	{
		if( value.id !== ID ) return false;

		Target = index;
		return true;
	});
	// founded ?
	if( Target === null )
	{
		Logger.debug( '(uninstall)invalid logger ID - not found' + ID );
		return;
	}
	this.LoggerList.slice( Target, 1 );
	this.ApiRegister[ID] = null;
};

Logger.listen = function( ID, Name )
{
	let AppApi = new Homey.ApiApp( ID );
	let FriendlyName = Name !== undefined ? Name : ID;
	this.ApiRegister[ID] = AppApi;

	// register events
	AppApi.register().
	on( 'install', function()
	{
		Logger.debug( FriendlyName + ' installed/added' );
		this.loggerInstalled( ID );
	}.bind( this ) ).
	on( 'uninstall', function()
	{
		this.loggerUninstalled( ID );
		Logger.debug( FriendlyName + ' uninstalled/removed' );
	}.bind( this ) );

	// check for current install state
	AppApi.getInstalled().then( function( installed )
	{
		if( !installed ) return;

		Logger.debug( FriendlyName + ' is installed/added' );
		this.loggerInstalled( ID );
	}.bind( this ) );
};

module.exports = Logger;