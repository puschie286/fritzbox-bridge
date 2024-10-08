supported devices:
* CometDECT, Fritz!DECT 300/301
* Fritz!DECT 200/210, FRITZ!Powerline 546E
* HANFUN Alarm
* FRITZ!Box
* RolloTron DECT
* DECT 500
* DECT 400/440

require a user account with "FRITZ!Box-Settings" permissions (or at least "Smart Home" ).
More information under https://en.avm.de/service/knowledge-base/dok/FRITZ-Box-7369-int/1522_Accessing-FRITZ-Box-from-the-home-network-with-user-accounts/

supported sensors & values:
https://github.com/puschie286/fritzbox-bridge/wiki/Supported-devices-&-sensors

Used icons from: https://www.flaticon.com/authors/freepik

known limits:
* CometDECT
  * measurements have a delay ( max. 15min )
  * sending commands can take up to 15min to take effect
  * temperature sensor has higher resolution internal
* DECT 400/440
  * buttons are visible on device despite not manual trigger able
  * wrong trigger cards may be displayed after adding ( restart of app should fix that )
  * trigger delay depends on polling interval ( can be changed in app setting )
