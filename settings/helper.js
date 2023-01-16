"use strict";
let SettingHelper = {};
(function(Helper){

    /*
    Load id from Homey and store it in id value
     */
    Helper.Load = function( id, Homey, type, defaultValue )
    {
        Homey.get( id, function( err, value )
        {
            if( err ) return Homey.alert( err );
            let Target = document.getElementById( id );
            if( ( value === null || value === undefined ) && defaultValue !== undefined )
            {
                value = defaultValue;
            }
            if( type === 'checkbox' )
            {
                Target.checked = Boolean( value );
            }
            else
            {
                Target.value = value;
            }
        });
    };

    /*
    Save id value to Homey
     */
    Helper.Save = function( id, Homey, type )
    {
        let Target = document.getElementById( id );
        let Value;
        if( type === 'checkbox' )
        {
            Value = Target.checked;
        }
        else
        {
            Value = Target.value;
        }
		Homey.get( id, function( err, value )
		{
			if( err ) return Homey.alert( err );
			if( value === Value ) return;
			Homey.set( id, Value, function( err )
			{
				if( err ) return Homey.alert( err );
			});
		} );
    };

	Helper.Validate = function( Homey, target, result )
	{
		Homey.get( 'validation', function( err, value )
		{
			if( err )
			{
				// loop end
				target.disabled = false;
				result.innerText = Homey.__( 'Message.ErrorLogin' );
				console.log( 'error: ' + err );
				return;
			}

			let Value = Number.parseInt( value );

			// check for wait state -> back to begin
			if( Value === 2 )
			{
				// add delay to save performance
				setTimeout( () => Helper.Validate( Homey, target, result ), 500 );
				return;
			}

			// make sure we re-enable button
			target.disabled = false;

			// show result to user
			if( Value === 1 )
			{
				result.innerText = Homey.__( 'Message.ValidLogin' );
			}
			else
			{
				Homey.get( 'validationInfo', function( err, value )
				{
					console.log( 'validtion info: ' + value );
					if( err )
					{
						console.log( 'error: ' + err );
						result.innerText = Homey.__( 'Message.InvalidLogin' );
					}
					else
					{
						result.innerText = value;
					}
				} );
			}
		});
	}

    /*
    Load ValueIDArray and create click listener on SaveID to Save ValueIDArray
     */
    Helper.AutoConfig = function( Homey, SaveId, StatusId, ValueIDArray )
    {
        if( !Array.isArray( ValueIDArray ) || ValueIDArray.length === 0 )
            return Homey.alert( 'Invalid ID Array' );

        if( !Homey )
        {
            return alert( 'Invalid Homey instance' );
        }

        const target = document.getElementById( SaveId );
        if( target === null )
        {
            return Homey.alert( 'Invalid SaveId' );
        }
		const result = document.getElementById( StatusId );
		if( result === null )
		{
			return Homey.alert( 'Invalid StatusId' );
		}
		Homey.get( 'validation', function( err, value )
		{
			if( !(err || Number.parseInt( value ) !== 1) )
			{
				result.innerText = Homey.__( 'Message.ValidLogin' );
			}
		} );

        for( const ID of ValueIDArray )
		{
			Helper.Load( ID.id, Homey, ID.type, ID.default );
		}

		target.addEventListener( 'click', function()
        {
            for( const ID of ValueIDArray )
			{
				Helper.Save( ID.id, Homey, ID.type );
			}

			target.disabled = true;
        } );

		Homey.on( 'settings.set', function( name )
		{
			if( name !== 'validation' ) return;

			Helper.Validate( Homey, target, result );
		} );
    };
})(SettingHelper);
