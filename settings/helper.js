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
        Homey.set( id, Value, function( err )
        {
            if( err ) return Homey.alert( err );
        });
    };

    /*
    Wait for validation result
     */
    Helper.Validate = function( Homey, SaveID )
    {
        let Target = document.getElementById( SaveID );
        Target.disabled = true;

        Homey.get( 'validation', function( err, value )
        {
            if( err )
            {
                // loop end
                Target.disabled = false;
                Homey.alert( 'Invalid Login - error' );
                console.log( 'error: ' + err );
                return;
            }

            let Value = Number.parseInt( value );

            // check for wait state -> back to begin
            if( Value === 2 )
            {
                // add delay to save performance
                setTimeout( () => Helper.Validate( Homey, SaveID ), 500 );
                return;
            }

            // make sure we re-enable button
            Target.disabled = false;

            // show result to user
            if( Value )
                Homey.alert( 'Valid Login' );
            else
            {
                Homey.get( 'validationInfo', function( err, value )
                {
                    Homey.alert( 'Invalid Login' );

                    if( err ) return;

                    Homey.alert( value );
                } );
            }
        });
    };

    /*
    Load ValueIDArray and create click listener on SaveID to Save ValueIDArray
     */
    Helper.AutoConfig = function( Homey, SaveID, ValueIDArray )
    {
        if( !Array.isArray( ValueIDArray ) || ValueIDArray.length === 0 )
            return Homey.alert( 'Invalid ID Array' );

        if( !Homey )
        {
            return alert( 'Invalid Homey instance' );
        }

        let Target = document.getElementById( SaveID );
        if( Target === null )
        {
            return Homey.alert( 'Invalid SaveID' );
        }

        ValueIDArray.forEach( function( ID )
        {
            Helper.Load( ID.id, Homey, ID.type, ID.default );
        });

        Target.addEventListener( 'click', function()
        {
            ValueIDArray.forEach( function( ID )
            {
                Helper.Save( ID.id, Homey, ID.type );
            });
            Helper.Validate( Homey, SaveID );
        })
    };
})(SettingHelper);