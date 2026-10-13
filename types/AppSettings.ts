import type { LoginSettings } from './LoginSettings';

export interface AppSettings extends LoginSettings
{
	pollinginterval: number;
	request_smarthome: boolean;
	request_network: boolean;
	showunconnected: boolean;
	allowmultiple: boolean;
	skipdectcheck: boolean;
}
