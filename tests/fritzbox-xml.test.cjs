'use strict';
const assert = require( 'node:assert/strict' );
const test = require( 'node:test' );
const { loadTypescript } = require( './helpers.cjs' );
const { ParseXml, ParseDeviceList, ParseTemplates } = loadTypescript( 'lib/FritzboxXml.ts' );

// These XML fixtures are constructed from the documented protocol and parsed
// device_examples/ shapes; they are not captured hardware responses.
const plain = value => JSON.parse( JSON.stringify( value ) );

test( 'empty device and template roots consistently return arrays', () =>
{
	for( const xml of [ '<devicelist/>', '<devicelist version="1"/>', '<devicelist>\n\t</devicelist>' ] )
	{
		assert.deepEqual( plain( ParseDeviceList( xml ) ), [] );
	}
	for( const xml of [ '<templatelist/>', '<templatelist></templatelist>' ] )
	{
		assert.deepEqual( plain( ParseTemplates( xml ) ), [] );
	}
	assert.deepEqual( plain( ParseXml( '<SessionInfo/>', 'SessionInfo' ) ), {} );
} );

test( 'singleton devices retain string attributes, nested fields, names, and empty scalars', () =>
{
	const devices = ParseDeviceList( `<?xml version="1.0" encoding="UTF-8"?>
<devicelist version="1" fwversion="8.00">
	<device identifier="00123 04567-1" id="00035" functionbitmask="35712" fwversion="04.25" manufacturer="AVM" productname="FRITZ!DECT 200">
		<present>1</present><name>  Küche &amp; Licht  </name>
		<switch><state>1</state><mode>manuell</mode></switch>
		<temperature><celsius>295</celsius><offset>0</offset></temperature>
		<button><lastpressedtimestamp/></button>
	</device>
</devicelist>` );
	assert.equal( devices.length, 1 );
	assert.deepEqual( plain( devices[0] ), {
		identifier: '0012304567-1', id: '00035', functionbitmask: '35712', fwversion: '04.25',
		manufacturer: 'AVM', productname: 'FRITZ!DECT 200', present: '1', name: '  Küche & Licht  ',
		switch: { state: '1', mode: 'manuell' }, temperature: { celsius: '295', offset: '0' },
		button: { lastpressedtimestamp: '' }
	} );
} );

test( 'device lists include only identified direct devices and retain HAN-FUN suffixes', () =>
{
	const devices = ParseDeviceList( `<devicelist>
	<device identifier="0001 2222"><name>Outlet</name><unit><device identifier="nested-unit"/></unit></device>
	<device identifier="0001 2222-2"><etsiunitinfo><unittype>273</unittype></etsiunitinfo></device>
	<device><name>Missing AIN</name></device><device identifier=" "/>
	<group identifier="group"><device identifier="nested-group"/></group>
</devicelist>` );
	assert.deepEqual( plain( devices.map( device => device.identifier ) ), [ '00012222', '00012222-2' ] );
	assert.equal( devices[0].unit.device.identifier, 'nested-unit' );
	assert.equal( devices[1].etsiunitinfo.unittype, '273' );
} );

test( 'repeated buttons and units are arrays while singleton child nodes remain objects', () =>
{
	const [ device ] = ParseDeviceList( `<devicelist><device identifier="123">
	<button identifier="123-1"><lastpressedtimestamp>00017</lastpressedtimestamp></button>
	<button identifier="123-2"><lastpressedtimestamp/></button>
	<unit id="1"><etsiunitinfo><unittype>273</unittype></etsiunitinfo></unit>
	<unit id="2"><etsiunitinfo><unittype>513</unittype></etsiunitinfo></unit>
</device></devicelist>` );
	assert.deepEqual( plain( device.button ), [
		{ identifier: '123-1', lastpressedtimestamp: '00017' },
		{ identifier: '123-2', lastpressedtimestamp: '' }
	] );
	assert.equal( device.unit.length, 2 );
	assert.deepEqual( plain( device.unit[0].etsiunitinfo ), { unittype: '273' } );
} );

test( 'text and CDATA fragments combine without losing whitespace or attribute values', () =>
{
	const root = ParseXml( `<root>
	<name>  Living<![CDATA[ & ]]><!-- split text -->Dining  Room  </name>
	<reading unit="°C">  21<![CDATA[.5 ]]></reading>
	<empty unit="°C"/><scalar/><space> </space><attributeSpace unit="x"> </attributeSpace>
	<mixed>before <child>value</child> after</mixed>
</root>`, 'root' );
	assert.deepEqual( plain( root ), {
		name: '  Living & Dining  Room  ', reading: { unit: '°C', _text: '  21.5 ' },
		empty: { unit: '°C' }, scalar: '', space: ' ', attributeSpace: { unit: 'x', _text: ' ' },
		mixed: { child: 'value', _text: 'before  after' }
	} );
} );

test( 'XML predefined and numeric entities decode in both text and attributes', () =>
{
	const root = ParseXml( `<root label="&quot;&apos;&lt;&gt;&amp;&#252;&#x1F4A1;">
<name>&quot;&apos;&lt;&gt;&amp;&#252;&#x1F4A1;</name></root>`, 'root' );
	assert.equal( root.label, '"\'<>&ü💡' );
	assert.equal( root.name, root.label );
} );

test( 'safe own XML properties preserve reserved tag and attribute names', () =>
{
	const root = ParseXml( `<root __proto__="attribute" hasOwnProperty="kept" next="still parsed"><constructor>constructor value</constructor>
<prototype>prototype value</prototype><__proto__>child value</__proto__><toString>text value</toString></root>`, 'root' );
	assert.equal( Object.hasOwn( root, '__proto__' ), true );
	assert.deepEqual( plain( root.__proto__ ), [ 'attribute', 'child value' ] );
	assert.equal( root.constructor, 'constructor value' );
	assert.equal( root.hasOwnProperty, 'kept' );
	assert.equal( root.next, 'still parsed' );
	assert.equal( root.toString, 'text value' );
	assert.equal( Object.getPrototypeOf( root ).polluted, undefined );
	assert.equal( {}.polluted, undefined );
} );

test( 'templates filter auto-generated entries by actual subtemplate structure', () =>
{
	const templates = ParseTemplates( `<templatelist version="1">
	<template identifier="manual-001" autocreate="0"><name>  Dinner &amp; movie  </name></template>
	<template identifier="manual-empty" autocreate="0"><name>Manual</name><sub_templates/></template>
	<template identifier="auto-missing" autocreate="1"><name>Hidden</name></template>
	<template identifier="auto-empty" autocreate="1"><sub_templates/></template>
	<template identifier="auto-scalar" autocreate="1"><sub_templates> </sub_templates></template>
	<template identifier="auto-combined" autocreate="1"><name>Combined</name><sub_templates>
		<template identifier="nested-only"/><template identifier="nested-two"/>
	</sub_templates></template>
	<template identifier="unknown" autocreate="2"><name>Hidden</name></template>
</templatelist>` );
	assert.deepEqual( plain( templates.map( template => template.identifier ) ), [ 'manual-001', 'manual-empty', 'auto-combined' ] );
	assert.equal( templates[0].name, '  Dinner & movie  ' );
	assert.equal( templates[1].sub_templates, '' );
	assert.deepEqual( plain( templates[2].sub_templates.template ), [ { identifier: 'nested-only' }, { identifier: 'nested-two' } ] );
} );

test( 'singleton templates and SessionInfo roots retain their consumer-facing shape', () =>
{
	const templates = ParseTemplates( '<templatelist><template identifier="00123" autocreate="0"><name>Scene</name></template></templatelist>' );
	assert.deepEqual( plain( templates ), [ { identifier: '00123', autocreate: '0', name: 'Scene' } ] );
	assert.deepEqual( plain( ParseXml( '<SessionInfo><SID>0011223344556677</SID><Challenge>2$1$ab$1$cd</Challenge><BlockTime>0</BlockTime></SessionInfo>', 'SessionInfo' ) ), {
		SID: '0011223344556677', Challenge: '2$1$ab$1$cd', BlockTime: '0'
	} );
} );

for( const [ description, xml ] of [
	[ 'empty response', '' ],
	[ 'truncated document', '<devicelist><device identifier="secret-value">' ],
	[ 'mismatched tags', '<devicelist><device></devicelist>' ],
	[ 'unquoted attribute', '<devicelist><device identifier=123/></devicelist>' ],
	[ 'duplicate attributes', '<devicelist><device identifier="123" identifier="456"/></devicelist>' ],
	[ 'unknown XML entity', '<devicelist><name>&custom;</name></devicelist>' ],
	[ 'HTML entity', '<devicelist><name>&nbsp;</name></devicelist>' ],
	[ 'bare ampersand', '<devicelist><name>A & B</name></devicelist>' ],
	[ 'unexpected document root', '<html><body>Login</body></html>' ],
	[ 'multiple document roots', '<devicelist/><devicelist/>' ],
	[ 'text before the root', 'unexpected<devicelist/>' ],
	[ 'text after the root', '<devicelist/>unexpected' ],
	[ 'CDATA outside the root', '<![CDATA[ ]]><devicelist/>' ],
	[ 'DTD declaration', '<!DOCTYPE devicelist SYSTEM "http://example.invalid/devices.dtd"><devicelist/>' ],
	[ 'custom entity declaration', '<!DOCTYPE devicelist [<!ENTITY secret "secret-value">]><devicelist><name>&secret;</name></devicelist>' ],
	[ 'SGML declaration', '<!ENTITY custom "value"><devicelist/>' ]
] )
{
	test( 'strict XML rejects ' + description + ' with sanitized diagnostics', () =>
	{
		assert.throws( () => ParseDeviceList( xml ), error =>
		{
			assert.equal( error.name, 'FritzboxXmlError' );
			assert.equal( error.code, 'EPROTO' );
			assert.equal( error.message, 'Invalid FRITZ!Box XML response' );
			assert.equal( error.cause, undefined );
			assert.equal( String( error ).includes( 'secret-value' ), false );
			return true;
		} );
	} );
}

test( 'unexpected template roots also fail instead of appearing empty', () =>
{
	assert.throws( () => ParseTemplates( '<devicelist/>' ), { code: 'EPROTO' } );
} );
