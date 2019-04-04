'use strict';

const Homey = require('homey');
const LoggerAdapter = require( './loggerAdapter' );

let LOG =
{
	LoggerList: [],

	SystemCopy: true,

	init: function( systemLogger )
	{
		this.LoggerList.push( this.createLogger( systemLogger ) );

		let SimpleLOG = new Homey.ApiApp( 'nl.nielsdeklerk.log' );

		// register
		SimpleLOG.register().
		on( 'install', function()
		{
			systemLogger( 'Simple-LOG installed' );
			this.LoggerList.push( this.createLogger( SimpleLog ) );
		}.bind( this ) ).
		on( 'uninstall', function()
		{
			systemLogger( 'Simple-LOG uninstalled' );

			// TODO: better validation
			if( this.LoggerList.length > 1 )
			{
				this.LoggerList.pop();
			}
		}.bind( this ) );

		let SimpleLog = function( message )
		{
			SimpleLOG.put( '/addlog/', { log: message, group: 'fritz-bridge' } ).then( () => {}).catch( ( error ) =>
			{
				systemLogger( 'failed to log: ' + error );

				// pass message system logger
				if( LOG.SystemCopy ) return;
				systemLogger( message );
			});

			// check for copy ( to system logger ) flag
			if( LOG.SystemCopy )
			{
				systemLogger( message );
			}
		};

		SimpleLOG.getInstalled().then( function( installed )
		{
			if( !installed ) return;

			this.LoggerList.push( this.createLogger( SimpleLog ) );
		}.bind( this ) );
	},

	/**
	 * create logger from log function
	 * @param {function} logFunction
	 * @return {LoggerAdapter}
	 */
	createLogger: function( logFunction )
	{
		let NewLogger = new LoggerAdapter();
		NewLogger.logFunc = logFunction;
		return NewLogger;
	},

	/**
	 * System is unusable.
	 *
	 * @param message   logging message
	 * @param context   placeholder values
	 * @return void
	 */
	emergency: function( message, context )
	{
		this.log( LoggerAdapter.CONST.EMERGENCY, message, context );
	},

	/**
	 * Action must be taken immediately.
	 *
	 * Example: Entire website down, database unavailable, etc. This should
	 * trigger the SMS alerts and wake you up.
	 *
	 * @param message   logging message
	 * @param context   placeholder values
	 * @return void
	 */
	alert: function( message, context )
	{
		this.log( LoggerAdapter.CONST.ALERT, message, context );
	},

	/**
	 * Critical conditions.
	 *
	 * Example: Application component unavailable, unexpected exception.
	 *
	 * @param message   logging message
	 * @param context   placeholder values
	 * @return void
	 */
	critical: function( message, context )
	{
		this.log( LoggerAdapter.CONST.CRITICAL, message, context );
	},

	/**
	 * Runtime errors that do not require immediate action but should typically
	 * be logged and monitored.
	 *
	 * @param message   logging message
	 * @param context   placeholder values
	 * @return void
	 */
	error: function( message, context )
	{
		this.log( LoggerAdapter.CONST.ERROR, message, context );
	},

	/**
	 * Exceptional occurrences that are not errors.
	 *
	 * Example: Use of deprecated APIs, poor use of an API, undesirable things
	 * that are not necessarily wrong.
	 *
	 * @param message   logging message
	 * @param context   placeholder values
	 * @return void
	 */
	warning: function( message, context )
	{
		this.log( LoggerAdapter.CONST.WARNING, message, context );
	},

	/**
	 * Normal but significant events.
	 *
	 * @param message   logging message
	 * @param context   placeholder values
	 * @return void
	 */
	notice: function( message, context )
	{
		this.log( LoggerAdapter.CONST.NOTICE, message, context );
	},

	/**
	 * Interesting events.
	 *
	 * Example: User logs in, SQL logs.
	 *
	 * @param message   logging message
	 * @param context   placeholder values
	 * @return void
	 */
	info: function( message, context )
	{
		this.log( LoggerAdapter.CONST.INFO, message, context );
	},

	/**
	 * Detailed debug information.
	 *
	 * @param message   logging message
	 * @param context   placeholder values
	 * @return void
	 */
	debug: function( message, context )
	{
		this.log( LoggerAdapter.CONST.DEBUG, message, context );
	},

	/**
	 * Logs with an arbitrary level.
	 *
	 * @param level
	 * @param message
	 * @param context
	 * @return void
	 */
	log: function( level, message, context )
	{
		this.LoggerList[this.LoggerList.length-1].log( level, message, context );
	}
};

module.exports = LOG;