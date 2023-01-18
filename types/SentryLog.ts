export interface SentryLog
{
	captureException( err: any ): Promise<string>|undefined;
	captureMessage( message: string ): Promise<string>|undefined;
	setExtra( extra: object ): SentryLog;
	setTags( tags: object ): SentryLog;
	setUser( user: object ): SentryLog;
}
