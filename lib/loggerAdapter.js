'use strict';

const LogLevel =
{
	EMERGENCY:  'emergency',
	ALERT:      'alert',
	CRITICAL:   'critical',
	ERROR:      'error',
	WARNING:    'warning',
	NOTICE:     'notice',
	INFO:       'info',
	DEBUG:      'debug',
};

class LoggerAdapter
{
	/**
	 * System is unusable.
	 *
	 * @param message   logging message
	 * @param context   placeholder values
	 * @return void
	 */
	emergency( message, context )
	{
		this.log( LogLevel.EMERGENCY, message, context );
	}

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
	alert( message, context )
	{
		this.log( LogLevel.ALERT, message, context );
	}

	/**
	 * Critical conditions.
	 *
	 * Example: Application component unavailable, unexpected exception.
	 *
	 * @param message   logging message
	 * @param context   placeholder values
	 * @return void
	 */
	critical( message, context )
	{
		this.log( LogLevel.CRITICAL, message, context );
	}

	/**
	 * Runtime errors that do not require immediate action but should typically
	 * be logged and monitored.
	 *
	 * @param message   logging message
	 * @param context   placeholder values
	 * @return void
	 */
	error( message, context )
	{
		this.log( LogLevel.ERROR, message, context );
	}

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
	warning( message, context )
	{
		this.log( LogLevel.WARNING, message, context );
	}

	/**
	 * Normal but significant events.
	 *
	 * @param message   logging message
	 * @param context   placeholder values
	 * @return void
	 */
	notice( message, context )
	{
		this.log( LogLevel.NOTICE, message, context );
	}

	/**
	 * Interesting events.
	 *
	 * Example: User logs in, SQL logs.
	 *
	 * @param message   logging message
	 * @param context   placeholder values
	 * @return void
	 */
	info( message, context )
	{
		this.log( LogLevel.INFO, message, context );
	}

	/**
	 * Detailed debug information.
	 *
	 * @param message   logging message
	 * @param context   placeholder values
	 * @return void
	 */
	debug( message, context )
	{
		this.log( LogLevel.DEBUG, message, context );
	}

	/**
	 * Logs with an arbitrary level.
	 *
	 * @param level     target LogLevel
	 * @param message   logging message
	 * @param context   placeholder values
	 * @return void
	 */
	log( level, message, context )
	{
		if( typeof this.logFunc !== 'function' ) return;

		// formats message
		let ResultMessage = message;
		if( Array.isArray( context ) && context.length > 0 )
		{
			for( let i = 0; i < context.length; ++i )
			{
				// TODO: validate context[i]
				ResultMessage = ResultMessage.replace( '{' + i + '}', context[i] );
			}
		}

		this.logFunc( '[' + level + '] ' + ResultMessage );
	}
}

module.exports = LoggerAdapter;
module.exports.CONST = LogLevel;