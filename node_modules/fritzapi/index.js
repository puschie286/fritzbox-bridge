/**
 * smartFritz - Fritz goes smartHome
 *
 * AVM SmartHome nodeJS Control - for AVM Fritz!Box and Dect200 Devices
 *
 * @author Andreas Goetz <cpuidle@gmx.de>
 *
 * Forked from: https://github.com/nischelwitzer/smartfritz
 * nischi - first version: July 2014
 *
 * based on: Node2Fritz by steffen.timm on 05.12.13 for Fritz!OS > 05.50
 * and  thk4711 (code https://github.com/pimatic/pimatic/issues/38)
 *
 * AVM Documentation is at https://avm.de/service/schnittstellen/
 */

/* jshint esversion: 6, -W079 */
var Promise = require('bluebird');
var request = require('request');
var parser = require('xml2json-light');
var extend = require('extend');


/*
 * Object-oriented API
 */

module.exports.Fritz = Fritz;

function Fritz(username, password, uri, strictssl) {
    this.sid = null;
    this.username = username;
    this.password = password;
    this.options = { url: uri || 'http://fritz.box', strictSSL: strictssl };

    //bitfunctions hidden, unchangable to prototype
    if (!Fritz.prototype.ALARM)             { Object.defineProperty( Fritz.prototype, "ALARM",             {value: module.exports.FUNCTION_ALARM,             writable: false}); }
    if (!Fritz.prototype.THERMOSTAT)        { Object.defineProperty( Fritz.prototype, "THERMOSTAT",        {value: module.exports.FUNCTION_THERMOSTAT,        writable: false}); }
    if (!Fritz.prototype.ENERGYMETER)       { Object.defineProperty( Fritz.prototype, "ENERGYMETER",       {value: module.exports.FUNCTION_ENERGYMETER,       writable: false}); }
    if (!Fritz.prototype.TEMPERATURESENSOR) { Object.defineProperty( Fritz.prototype, "TEMPERATURESENSOR", {value: module.exports.FUNCTION_TEMPERATURESENSOR, writable: false}); }
    if (!Fritz.prototype.OUTLET)            { Object.defineProperty( Fritz.prototype, "OUTLET",            {value: module.exports.FUNCTION_OUTLET,            writable: false}); }
    if (!Fritz.prototype.DECTREPEATER)      { Object.defineProperty( Fritz.prototype, "DECTREPEATER",      {value: module.exports.FUNCTION_DECTREPEATER,      writable: false}); }
}

Fritz.prototype = {
    call: function(func) {
        var originalSID = this.sid;

        /* jshint laxbreak:true */
        var promise = this.sid !== '0000000000000000' && this.sid
            ? Promise.resolve(this.sid)
            : module.exports.getSessionID(this.username, this.password, this.options);

        // function arguments beyond func parameter
        var args = Array.from(arguments).slice(1).concat(this.options);

        return promise.then(function(sid) {
            this.sid = sid;

            return func.apply(null, [this.sid].concat(args)).catch(function(error) {
                if (error.response && error.response.statusCode == 403) {
                    // this.sid has not been updated or is invalid - get a new SID
                    if (this.sid === null || this.sid === originalSID) {
                        this.sid = null;

                        return module.exports.getSessionID(this.username, this.password, this.options).then(function(sid) {
                            // this session id is the most current one - so use it from now on
                            this.sid = sid;

                            return func.apply(null, [this.sid].concat(args));
                        }.bind(this));
                    }
                    // this.sid has already been updated during the func() call - assume this is a valid SID now
                    else {
                        return func.apply(null, [this.sid].concat(args));
                    }
                }

                throw error;
            }.bind(this));
        }.bind(this));
    },

    getSID: function() {
        return this.sid;
    },

    getOverviewData: function() {
        return this.call(module.exports.getOverviewData);
    },

    getDeviceList: function() {
        return this.call(module.exports.getDeviceList);
    },


    setSwitchOn: function(ain) {
        return this.call(module.exports.setSwitchOn, ain);
    },

    setSwitchOff: function(ain) {
        return this.call(module.exports.setSwitchOff, ain);
    },

    setTempTarget: function(ain, temp) {
        return this.call(module.exports.setTempTarget, ain, temp);
    },

    /*
     * Helper functions
     */
    api2temp: module.exports.api2temp,
    temp2api: module.exports.temp2api
};


/*
 * Functional API
 */

var defaults = { url: 'http://fritz.box' };

/**
 * Execute HTTP request that honors failed/invalid login
 */
function httpRequest(path, req, options)
{
    return new Promise(function(resolve, reject) {
        req = extend({}, defaults, req, options);
        req.url += path;

        request(req, function(error, response, body) {
            if (error || !(/^2/.test('' + response.statusCode)) || /action=".?login.lua"/.test(body)) {
                if (/action=".?login.lua"/.test(body)) {
                    // fake failed login if redirected to login page without HTTP 403
                    response.statusCode = 403;
                }
                reject({
                    error: error,
                    response: response,
                    options: req
                });
            }
            else {
                resolve(body.trim());
            }
        });
    });
}

/**
 * Execute Fritz API command for device specified by AIN
 */
function executeCommand(sid, command, ain, options, path)
{
    path = path || '/webservices/homeautoswitch.lua?0=0';

    if (sid)
        path += '&sid=' + sid;
    if (command)
        path += '&switchcmd=' + command;
    if (ain)
        path += '&ain=' + ain;

    return httpRequest(path, {}, options);
}

/*
 * Temperature conversion
 */
const MIN_TEMP = 8;
const MAX_TEMP = 28;

function temp2api(temp)
{
    var res;

    if (temp == 'on' || temp === true)
        res = 254;
    else if (temp == 'off' || temp === false)
        res = 253;
    else {
        // 0.5C accuracy
        res = Math.round((Math.min(Math.max(temp, MIN_TEMP), MAX_TEMP) - 8) * 2) + 16;
    }

    return res;
}

function api2temp(param)
{
    if (param == 254)
        return 'on';
    else if (param == 253)
        return 'off';
    else {
        // 0.5C accuracy
        return (parseFloat(param) - 16) / 2 + 8;
    }
}

// #############################################################################

// run command for selected device
module.exports.executeCommand = executeCommand;
module.exports.api2temp = api2temp;
module.exports.temp2api = temp2api;

// supported temperature range
module.exports.MIN_TEMP = MIN_TEMP;
module.exports.MAX_TEMP = MAX_TEMP;

// functions bitmask
module.exports.FUNCTION_ALARM               = 1 << 4;  // Alarm Sensor
module.exports.FUNCTION_THERMOSTAT          = 1 << 6;  // Comet DECT, Heizkostenregler
module.exports.FUNCTION_ENERGYMETER         = 1 << 7;  // Energie Messgerät
module.exports.FUNCTION_TEMPERATURESENSOR   = 1 << 8;  // Temperatursensor
module.exports.FUNCTION_OUTLET              = 1 << 9;  // Schaltsteckdose
module.exports.FUNCTION_DECTREPEATER        = 1 << 10; // AVM DECT Repeater

/*
 * Session handling
 */

// get session id
module.exports.getSessionID = function(username, password, options)
{
    if (typeof username !== 'string') throw new Error('Invalid username');
    if (typeof password !== 'string') throw new Error('Invalid password');

    return executeCommand(null, null, null, options, '/login_sid.lua').then(function(body) {
        var challenge = body.match("<Challenge>(.*?)</Challenge>")[1];
        var challengeResponse = challenge +'-'+
            require('crypto').createHash('md5').update(Buffer(challenge+'-'+password, 'UTF-16LE')).digest('hex');
        var url = "/login_sid.lua?username=" + username + "&response=" + challengeResponse;

        return executeCommand(null, null, null, options, url).then(function(body) {
            var sessionID = body.match("<SID>(.*?)</SID>")[1];
            if (sessionID === "0000000000000000") {
                return Promise.reject(sessionID);
            }
            return sessionID;
        });
    });
};


/*
 * General functions
 */

// get device list
module.exports.getDeviceList = function(sid, options)
{
    return executeCommand( sid, 'getdevicelistinfos', null, options).then(function(devicelistinfo) {
        var devices = parser.xml2json(devicelistinfo);
        // extract devices as array
        devices = [].concat((devices.devicelist || {}).device || []).map(function(device) {
            // remove spaces in AINs
            device.identifier = device.identifier.replace(/\s/g, '');
            return device;
        });
        return devices;
    });
};

// get 'overview' page data
module.exports.getOverviewData = function(sid, options)
{
    let req = {
        method: 'POST',
        form: {
            sid: sid,
            shr: 1,
            page: 'overview'
        }
    };

    return httpRequest('/data.lua', req, options).then(function(body)
    {
        return JSON.parse(body);
    });
};

/*
 * Switches
 */

// turn an outlet on. returns the state the outlet was set to
module.exports.setSwitchOn = function(sid, ain, options)
{
    return executeCommand(sid, 'setswitchon', ain, options).then(function(body) {
        return /^1/.test(body); // true if on
    });
};

// turn an outlet off. returns the state the outlet was set to
module.exports.setSwitchOff = function(sid, ain, options)
{
    return executeCommand(sid, 'setswitchoff', ain, options).then(function(body) {
        return /^1/.test(body); // false if off
    });
};

/*
 * Thermostats
 */

// set target temperature (Solltemperatur)
module.exports.setTempTarget = function(sid, ain, temp, options)
{
    return executeCommand(sid, 'sethkrtsoll&param=' + temp2api(temp), ain, options).then(function(body) {
        // api does not return a value
        return temp;
    });
};
