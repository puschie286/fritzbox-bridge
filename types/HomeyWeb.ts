export interface HomeyWeb
{
	ready(): void,
	get( name: string, callback: any ): void
	set( name: string, value: any, callback: any ): void,
	unset( name: string, callback: any ): void,
	on( event: string, callback: any ): void,
	api( method: string, path: string, body: any, callback: any ): void,
	alert( message: string, callback?: any ): void,
	confirm( message: string, callback: any ): void,
	popup( url: string, opts: object ): void,
	openURL( url: string ): void,
	__( key: string, tokens?: object ): string
}
