var soap = require('soap');
var debug = require('debug')('loopback:connector:soap');
/**
 * Export the initialize method to loopback-datasource-juggler
 * @param {DataSource} dataSource The data source object
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
 * @param {Object} settings The connector settings
 * @constructor
 */
function SOAPConnector(settings) {
  settings = settings || {};
  var endpoint = settings.endpoint || settings.url;
  var wsdl = settings.wsdl || (endpoint + '?wsdl');

  this.settings = settings || {};
  this.endpoint = endpoint; // The endpoint url
  this.wsdl = wsdl; // URL or path to the url

  if (debug.enabled) {
    debug('Settings: %j', settings);
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
  soap.createClient(self.wsdl, self.settings, function (err, client) {
    if (!err) {
      self.client = client;
      self.setupDataAccessObject();
    }
    cb && cb(err, client);
  }, self.endpoint);
};

/**
 * Find or derive the method name from service/port/operation
 * @param {String} serviceName The WSDL service name
 * @param {String} portName The WSDL port name
 * @param {String} operationName The WSDL operation name
 * @param {Object} dao The data access objecr
 * @returns {String} The method name
 * @private
 */
SOAPConnector.prototype._methodName = function (serviceName, portName, operationName, dao) {
  var methods = this.settings.operations || {};
  for (var m in methods) {
    var method = methods[m];
    if (method.service === serviceName && method.port === portName &&
      (method.operation = operationName ||
        method.operation === undefined && m === operationName)) {
      // Return the matched method name
      return m;
    }
  }

  if (dao && (operationName in dao)) {
    // The operation name exists, return full name
    return serviceName + '_' + portName + '_' + operationName;
  } else {
    return operationName;
  }
};

function setRemoting(wsMethod) {
  wsMethod.shared = true;
  wsMethod.accepts = [
    {arg: 'input', type: 'object', required: true,
      http: {source: 'body'}}
  ];
  wsMethod.returns = {arg: 'output', type: 'object', root: true};
}
/**
 *
 * @private
 * @returns {*}
 */
SOAPConnector.prototype.setupDataAccessObject = function () {
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

        var methodName = this._methodName(s, p, m, this.DataAccessObject);
        if (debug.enabled) {
          debug('Method name: %s', methodName);
        }
        var wsMethod = method.bind(this.client);
        this.DataAccessObject[methodName] = wsMethod;
        if (this.settings.remotingEnabled) {
          setRemoting(wsMethod);
        }
      }
    }
  }
  this.dataSource.DataAccessObject = this.DataAccessObject;
  for (var model in this._models) {
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
SOAPConnector.prototype.define = function (modelDef) {
  var m = modelDef.model.modelName;
  this._models[m] = modelDef;
};

