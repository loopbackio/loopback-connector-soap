'use strict';

var req = require('request');
var util = require('util');
var url = require('url');
var debug = require('debug')('node-soap');
var VERSION = require('../package.json').version;

var HttpClient = require('soap').HttpClient;

function LBHttpClient(options, connector) {
  if (!(this instanceof LBHttpClient)) {
    return new LBHttpClient(options, connector);
  }
  HttpClient.call(this, options);
  this.connector = connector;
}

util.inherits(LBHttpClient, HttpClient);

/**
 * Build the HTTP request (method, uri, headers, ...)
 * @param {String} rurl The resource url
 * @param {Object|String} data The payload
 * @param {Object} exheaders Extra http headers
 * @param {Object} exoptions Extra options
 * @returns {Object} The http request object for the `request` module
 */
LBHttpClient.prototype.buildRequest = function(rurl, data, exheaders, exoptions) {
  var curl = url.parse(rurl);
  // var secure = curl.protocol === 'https:';
  var host = curl.hostname;
  var port = parseInt(curl.port, 10);
  // var path = [curl.pathname || '/', curl.search || '', curl.hash || ''].join('');
  var method = data ? 'POST' : 'GET';
  var headers = {
    'User-Agent': 'loopback-connector-soap/' + VERSION,
    'Accept': 'text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'none',
    'Accept-Charset': 'utf-8',
    'Connection': 'close',
    'Host': host + (isNaN(port) ? '' : ':' + port)
  };
  var attr;

  if (typeof data === 'string') {
    headers['Content-Length'] = Buffer.byteLength(data, 'utf8');
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  exheaders = exheaders || {};
  for (attr in exheaders) {
    headers[attr] = exheaders[attr];
  }

  var options = {
    uri: curl,
    method: method,
    headers: headers,
    followAllRedirects: true
  };

  if (data != null) {
    options.body = data;
  }

  exoptions = exoptions || {};
  for (attr in exoptions) {
    options[attr] = exoptions[attr];
  }
  debug('Http request: %j', options);
  return options;
};

LBHttpClient.prototype.request = function(rurl, data, callback, exheaders, exoptions) {
  var self = this;
  var options = self.buildRequest(rurl, data, exheaders, exoptions);
  var context = {
    req: options
  };

  function invokeWebService(context, done) {
    req(options, function(error, res, body) {
      if (error) {
        done(error);
      } else {
        context.res = res;
        body = self.handleResponse(req, res, body);
        done(null, res, body);
      }
    });
  }

  if (self.connector && typeof self.connector.notifyObserversAround === 'function') {
    // Now node-soap calls request to load WSDLs
    self.connector.notifyObserversAround('execute', context, invokeWebService, callback);
  } else {
    invokeWebService(context, callback);
  }
  return options;
};

module.exports = LBHttpClient;
