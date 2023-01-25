import Homey from 'homey/lib/Homey';

export interface ApiParameter
{
	homey: Homey,
	body: object,
	params: object,
	query: object
}
