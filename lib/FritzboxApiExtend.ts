import { FritzboxPages } from '../types/FritzboxPages';

const extend = require( 'extend' );
const request = require( 'request' );

const defaults = { url: 'https://fritz.box', timeout: 15000 };

function httpRequest( path: string, req: any, options: any )
{
	return new Promise( function( resolve, reject )
	{
		req = extend( {}, defaults, req, options );
		req.url += path;

		request( req, function( error: any, response: any, body: any )
		{
			if( error || !( /^2/.test( '' + response.statusCode ) ) || /action=".?login.lua"/.test( body ) )
			{
				if( /action=".?login.lua"/.test( body ) )
				{
					// fake failed login if redirected to login page without HTTP 403
					response.statusCode = 403;
				}
				reject( {
					error: error, response: response, options: req
				} );
			}
			else
			{
				resolve( body.trim() );
			}
		} );
	} );
}

async function LoadData( sid: any, options: any, page?: string, xhrId?: string )
{
	const req = {
		method: 'POST', form: {
			sid: sid,
			xhrId: xhrId,
			xhr: 1,
			page: page
		}
	};

	const body: any = await httpRequest( '/data.lua', req, options );
	try
	{
		return JSON.parse( body );
	}
	catch( e )
	{
		console.error( 'failed to parse json: ' + body );
		return [];
	}
}

export async function LoadOverview( sid: any, options: any )
{
	return LoadData( sid, options );
}

export async function LoadNetwork( sid: any, options: any )
{
	return LoadData( sid, options, FritzboxPages.Network, 'cleanup' );
}
