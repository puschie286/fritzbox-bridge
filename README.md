# Fritzbox Bridge

Use your fritzbox as bridge and get access to all device sensors.<br>
Each sensor can be addressed individually and is synchronized via a single central query.
<br>Homey app

Used icons from: <a href="http://flaticon.com">Freepik</a>

#### flow card/tags
* most sensor properties have auto trigger/action cards

#### supported devices:
* CometDECT, Fritz!DECT 300/301
* Fritz!DECT 200/210, FRITZ!Powerline 546E
* HANFUN Alarm
* FRITZ!Box 

#### supported sensors & values
[list of supported devices & sensors](https://github.com/puschie286/fritzbox-bridge/wiki/Supported-devices-&-sensors) 

  
##### backward compatibility ( >= 0.5.0 )  
all devices that were paired before update will not be affected by device changes.
only new paired devices will use the newest device version ( system limitation *sry )

#### tested device/sensor list:
* CometDECT
  * measurements have a delay ( max. 15min )
  * sending commands can take up to 15min to take effect
  * temperature sensor has higher resolution internal
  
#### Device TODO's
* rewrite login process (fritzAPI)
* redesign config page (materialzecss)
* implement repeater driver
* add thermostat holidayactive + summeractive + nextchange
* add trigger when connecting/disconnecting wlan devices

### History

v0.5.1
* add 'current' capability for energymeter

v0.5.0
* optimize update process
* optimize device/driver structure
* implemented backward-compatibility system
* ready for beta

v0.3.5
* switch logging lib
* add options ( allow to pair disconnected devices, log level )
* add plug driver ( energymeter + switch )

v0.3.0
* add fritzbox driver
* add status polling ( for fritzbox driver )
* extend property filtering ( reduce memory usage by device )
* fix energymeter units

v0.2.2
* fix polling block after failing
* add username option to fritzbox login

v0.2.0
* added Simple-LOG support
* tiny changes for store release

v0.1.1
* fix polling settings

v0.1.0
* first (basic) Version
* basic driver: thermostat, switch, energymeter, temperature sensor, alarm sensor
