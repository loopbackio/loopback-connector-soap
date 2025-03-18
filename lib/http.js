// Copyright IBM Corp. 2015,2018. All Rights Reserved.
// Node module: loopback-connector-soap
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const req = require('postman-request');
const util = require('util');
const url = require('url');
const {soap: {HttpClient}} = require('strong-soap');
const debug = require('debug')('loopback:connector:soap:http');
const {version: VERSION} = require('../package.json');

function LBHttpClient(options, connector) {
  if (!(this instanceof LBHttpClient)) {
    return new LBHttpClient(options, connector);
  }
  const httpClient = new HttpClient(this, options);
  this.req = req;
  if (options && options.requestOptions) {
    this.req = req.defaults(options.requestOptions);
  }
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
  const curl = url.parse(rurl);
  // const secure = curl.protocol === 'https:';
  const host = curl.hostname;
  const port = parseInt(curl.port, 10);
  // const path = [curl.pathname || '/', curl.search || '', curl.hash || ''].join('');
  const method = data ? 'POST' : 'GET';
  const headers = {
    'User-Agent': `loopback-connector-soap/${VERSION}`,
    'Accept': 'text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'none',
    'Accept-Charset': 'utf-8',
    'Connection': 'close',
    'Host': host + (isNaN(port) ? '' : `:${port}`)
  };
  let attr;

  if (typeof data === 'string') {
    headers['Content-Length'] = Buffer.byteLength(data, 'utf8');
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  exheaders = exheaders || {};
  for (attr in exheaders) {
    headers[attr] = exheaders[attr];
  }

  const options = {
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
  const self = this;
  const options = self.buildRequest(rurl, data, exheaders, exoptions);
  const context = {
    req: options
  };

  function invokeWebService(context, done) {
    self.req(options, function(error, res, body) {
      if (error) {
        return done(error);
      }

      context.res = res;
      body = self.handleResponse(options, res, body);
      return done(null, res, body);
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
