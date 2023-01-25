import { SettingType } from './SettingType';

export interface SettingDefinition
{
	id: string,
	default: any,
	type?: SettingType,
}
