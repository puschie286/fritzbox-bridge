* most sensor properties have auto trigger/action cards

supported devices:
* CometDECT, Fritz!DECT 300/301
* Fritz!DECT 200/210, FRITZ!Powerline 546E
* HANFUN Alarm
* FRITZ!Box

flow trigger:
* wlan device connected
* wlan device disconnected

backward compatibility ( >= 0.5.0 ):
all devices that were paired before update will not be affected by device changes.
only new paired devices will use the newest device version

supported sensors & values:
https://github.com/puschie286/fritzbox-bridge/wiki/Supported-devices-&-sensors

Used icons from: https://www.flaticon.com/authors/freepik

known limits:
* CometDECT
  * measurements have a delay ( max. 15min )
  * sending commands can take up to 15min to take effect
  * temperature sensor has higher resolution internal
