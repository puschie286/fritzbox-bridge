import { parser } from 'sax';
import type { FritzboxApiDevice } from '../types/FritzboxTypes';
import type { Template } from '../types/Template';

export type XmlValue = string | XmlObject | XmlValue[];
export interface XmlObject
{
	[property: string]: XmlValue;
}

interface XmlNode
{
	name: string;
	value: XmlObject;
	text: string;
	children: number;
}

export class FritzboxXmlError extends Error
{
	readonly code = 'EPROTO';

	constructor()
	{
		super( 'Invalid FRITZ!Box XML response' );
		this.name = 'FritzboxXmlError';
	}
}

function AddValue( object: XmlObject, name: string, value: XmlValue ): void
{
	if( Object.hasOwn( object, name ) )
	{
		const previous = object[name];
		if( Array.isArray( previous ) ) previous.push( value );
		else Object.defineProperty( object, name, { value: [ previous, value ], enumerable: true, writable: true, configurable: true } );
		return;
	}

	// XML names such as __proto__ must remain data properties.
	Object.defineProperty( object, name, { value, enumerable: true, writable: true, configurable: true } );
}

function NodeValue( node: XmlNode ): XmlValue
{
	if( node.children === 0 && Object.keys( node.value ).length === 0 ) return node.text;
	if( node.text !== '' && ( node.children === 0 || node.text.trim() !== '' ) ) AddValue( node.value, '_text', node.text );
	return node.value;
}

/** Parse a strict XML document and return the expected root's contents. */
export function ParseXml( xml: string, expectedRoot: string ): XmlObject
{
	// strictEntities is supported by sax but absent from its current typings.
	const options = { strictEntities: true, trim: false, normalize: false };
	const sax = parser( true, options );
	const nodes: XmlNode[] = [];
	let attributes: XmlObject = {};
	let root: XmlValue | undefined;
	let rootSeen = false;

	sax.onerror = () => { throw new FritzboxXmlError(); };
	sax.ondoctype = () => { throw new FritzboxXmlError(); };
	sax.onsgmldeclaration = () => { throw new FritzboxXmlError(); };
	sax.onopentagstart = tag =>
	{
		attributes = {};
		// sax checks this method before emitting attributes, silently skipping
		// duplicates. Keep it callable even for an attribute of the same name.
		tag.attributes = Object.create( null );
		Object.defineProperty( tag.attributes, 'hasOwnProperty', {
			get: () => ( name: string ) =>
			{
				if( Object.hasOwn( attributes, name ) ) throw new FritzboxXmlError();
				return false;
			},
			set: () => undefined
		} );
	};
	sax.onattribute = attribute =>
	{
		if( Object.hasOwn( attributes, attribute.name ) ) throw new FritzboxXmlError();
		AddValue( attributes, attribute.name, attribute.value );
	};
	sax.onopentag = tag =>
	{
		if( nodes.length === 0 )
		{
			if( rootSeen || tag.name !== expectedRoot ) throw new FritzboxXmlError();
			rootSeen = true;
		}
		nodes.push( { name: tag.name, value: attributes, text: '', children: 0 } );
	};
	const AppendText = ( text: string ) =>
	{
		if( nodes.length > 0 ) nodes[nodes.length - 1].text += text;
		else if( text.trim() !== '' ) throw new FritzboxXmlError();
	};
	sax.ontext = AppendText;
	sax.oncdata = text =>
	{
		if( nodes.length === 0 ) throw new FritzboxXmlError();
		AppendText( text );
	};
	sax.onclosetag = () =>
	{
		const node = nodes.pop();
		if( node === undefined ) throw new FritzboxXmlError();
		const value = NodeValue( node );
		if( nodes.length === 0 ) root = value;
		else
		{
			const parent = nodes[nodes.length - 1];
			parent.children++;
			AddValue( parent.value, node.name, value );
		}
	};

	try
	{
		sax.write( xml ).close();
	}
	catch( error )
	{
		if( error instanceof FritzboxXmlError ) throw error;
		throw new FritzboxXmlError();
	}
	if( !rootSeen || root === undefined || nodes.length !== 0 ) throw new FritzboxXmlError();
	if( typeof root === 'string' ) return root.trim() === '' ? {} : { _text: root };
	if( Array.isArray( root ) ) throw new FritzboxXmlError();
	return root;
}

function Entries( value: XmlValue | undefined ): XmlObject[]
{
	const entries = Array.isArray( value ) ? value : value === undefined ? [] : [ value ];
	return entries.filter( ( entry ): entry is XmlObject => typeof entry === 'object' && !Array.isArray( entry ) );
}

export function ParseDeviceList( xml: string ): FritzboxApiDevice[]
{
	const root = ParseXml( xml, 'devicelist' );
	return Entries( root.device ).filter( device =>
	{
		if( typeof device.identifier !== 'string' ) return false;
		device.identifier = device.identifier.replaceAll( ' ', '' );
		return device.identifier !== '';
	} ) as unknown as FritzboxApiDevice[];
}

export function ParseTemplates( xml: string ): Template[]
{
	const root = ParseXml( xml, 'templatelist' );
	return Entries( root.template ).filter( template =>
		template.autocreate === '0' || ( template.autocreate === '1' && typeof template.sub_templates === 'object' )
	) as unknown as Template[];
}
