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

#### supported sensors
list of all sensors and their properties. ( f: set by fritzbox, d: set by device )
* alarm sensor v0
  * d: arlam state
* temperature sensor v0
  * measured temperature ( 0.1° - 0.5° steps )
  * f: offset
* switch/socket v0
  * on/off
  * f: switch mode ( schedule/manuel )
  * f: device locked
  * f: device api locked
* energymeter v0
  * measured power
  * measured voltage
  * metered power
* thermostat v0
  * on/off
  * measured temperature ( 0.5° steps )
  * target temperature ( 0.5° steps )
  * f: comfort temperature
  * f: night temperature
  * f: device api locked
  * f: device locked
  * d: battery state ( 0 - 100% )
  * d: battery low warning
  * d: open window
  * d: device error
* fritzbox v1
  * f: os version
  * f: alarm update available 
  
##### backward compatibility ( >= 0.5.0 )  
all devices that were paired before update will not be affected by device changes
only new paired devices will use the newest device version ( system limitation *sry )

#### tested device/sensor list:
* CometDECT
  * measurements have a delay ( max. 15min )
  * sending commands can take up to 15min to take effect
  * temperature sensor has higher resolution internal
  
#### Device TODO's
* driver: repeater
* functions: thermostat holidayactive + summeractive + nextchange, fritzbox statistics
* capabilities: energymeter measure_current

### History

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
