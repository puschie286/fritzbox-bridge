# Fritzbox Bridge

Use your fritzbox as bridge and get access to all device sensors.<br>
Each sensor can be addressed individually and is synchronized via a single central query.
<br>Homey app

Used icons from: <a href="http://flaticon.com">Freepik</a>

#### flow card/tags
* OSVersion - return the currrent fritzbox os version
* most sensor properties have auto trigger/action cards

#### supported device/sensor list:
* CometDECT, Fritz!DECT 300/301
* Fritz!DECT 200/210, FRITZ!Powerline 546E
* HANFUN Alarm

#### supported sensors + states
list of all sensors and their properties. ( f: set by fritzbox, d: set by device )
* alarm sensor
  * d: arlam state
* temperature sensor
  * measured temperature ( 0.1° - 0.5° steps )
  * f: offset
* switch/socket
  * on/off
  * f: switch mode ( schedule/manuel )
  * f: device locked
  * f: device api locked
* energymeter
  * measured power
  * measured voltage
  * metered power
* thermostat
  * on/off
  * measured temperature ( 0.5° steps )
  * target temperature ( 0.5° steps )
  * f: komfort temperature
  * f: night temperature
  * f: device api locked
  * f: device locked
  * d: battery state ( 0 - 100% )
  * d: battery low warning
  * d: open window
  * d: device error

#### tested device/sensor list:
* CometDECT
  * temperature sensor
    * measurements are not reliable ( 2-5min delay sometimes )
  * thermostat
    * use different temperature than temperature sensor is returning ( thermostat reliable reaches set temperature )

### TODOs
* driver: repeater ( only available state - no function )
* functions: wlan-guest-config set/get, thermostat holidayactive + summeractive

### History

v0.1.0
* first (basic) Version
* basic driver: thermostat, switch, energymeter, temperature sensor, alarm sensor
