'use strict';

var req = require('request');
var util = require('util');

var HttpClient = require('soap').HttpClient;

function LBHttpClient(options, connector) {
  if (!(this instanceof LBHttpClient)) {
    return new LBHttpClient(options, connector);
  }
  HttpClient.call(this, options);
  this.connector = connector;
}

util.inherits(LBHttpClient, HttpClient);

LBHttpClient.prototype.request = function(rurl, data, callback, exheaders, exoptions) {
  var self = this;
  var options = self.buildRequest(rurl, data, exheaders, exoptions);
  var context = {
    req: options
  };

  function work(context, done) {
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
  self.connector.notifyObserversAround('execute', context, work, callback);
  return options;
};

module.exports = LBHttpClient;
