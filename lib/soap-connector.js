var soap = require('soap');
var debug = require('debug')('loopback:connector:soap');
/**
 * Export the initialize method to loopback-datasource-juggler
 * @param dataSource
 * @param callback
 */
exports.initialize = function initializeDataSource(dataSource, callback) {
  var settings = dataSource.settings || {};

  var connector = new SOAPConnector(settings);

  dataSource.connector = connector;
  dataSource.connector.dataSource = dataSource;

  connector.connect(callback);

};

/**
 * The SOAPConnector constructor
 * @param options
 * @constructor
 */
function SOAPConnector(options) {
  options = options || {};
  var endpoint = options.endpoint || options.url;
  var wsdl = options.wsdl || (endpoint + '?wsdl');

  this.options = options;
  this.endpoint = endpoint; // The endpoint url
  this.wsdl = wsdl; // URL or path to the url

  if (debug.enabled) {
    debug('Settings: %j', options);
  }

  this._models = {};
}

SOAPConnector.prototype.connect = function (cb) {
  var self = this;
  if (self.client) {
    process.nextTick(function () {
      cb && cb(null, self.client);
    });
    return;
  }
  soap.createClient(self.wsdl, self.options, function (err, client) {
    if (!err) {
      self.client = client;
      self.getDataAccessObject();
    }
    cb && cb(err, client);
  }, self.endpoint);
};

/**
 *
 * @private
 * @returns {*}
 */
SOAPConnector.prototype.getDataAccessObject = function () {
  if (this.DataAccessObject) {
    return this.DataAccessObject;
  }

  this.DataAccessObject = function () {
    // Dummy function
  };

  for (var s in this.client.wsdl.services) {
    var service = this.client[s];
    for (var p in service) {
      var port = service[p];
      for (var m in port) {
        var method = port[m];
        if (debug.enabled) {
          debug('Adding method: %s %s %s', s, p, m);
        }
        if (m in this.DataAccessObject) {
          var methodName = s + '_' + p + '_' + m;
          if (debug.enabled) {
            debug('Method name: %s', methodName);
          }
          this.DataAccessObject[methodName] = method.bind(this.client);
        } else {
          if (debug.enabled) {
            debug('Method name: %s', m);
          }
          this.DataAccessObject[m] = method.bind(this.client);
        }
      }
    }
  }
  this.dataSource.DataAccessObject = this.DataAccessObject;
  for(var model in this._models) {
    if (debug.enabled) {
      debug('Mixing methods into : %s', model);
    }
    this.dataSource.mixin(this._models[model].model);
  }
  return this.DataAccessObject;
};

/**
 * Hook for defining a model by the data source
 * @param {object} modelDef The model description
 */
SOAPConnector.prototype.define = function(modelDef) {
    var m = modelDef.model.modelName;
    this._models[m] = modelDef;
};

