// Copyright IBM Corp. 2013,2018. All Rights Reserved.
// Node module: loopback-connector-soap
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const g = require('strong-globalize')();
const {soap} = require('strong-soap');
const debug = require('debug')('loopback:connector:soap');
const HttpClient = require('./http');

/**
 * Export the initialize method to loopback-datasource-juggler
 * @param {DataSource} dataSource The data source object
 * @param callback
 */
exports.initialize = function initializeDataSource(dataSource, callback) {
  dataSource.connector = new SOAPConnector(dataSource.settings || {});
  dataSource.connector.dataSource = dataSource;

  return dataSource.connector.connect(callback);
};

/**
 * The SOAPConnector constructor
 * @param {Object} settings The connector settings
 * @constructor
 */
function SOAPConnector(settings) {
  this.settings = settings || {};
  this.endpoint = this.settings.endpoint || this.settings.url; // The endpoint url
  this.wsdl = this.settings.wsdl || `${this.endpoint}?wsdl`; // URL or path to the url
  this.settings.httpClient = new HttpClient(this.settings, this);
  this._models = {};

  if (this.settings.ignoredNamespaces == null) {
    // Some WSDLs use tns as the prefix. Without the customization below, it
    // will remove tns: for qualified elements
    this.settings.ignoredNamespaces = {
      namespaces: [],
      override: true
    }
  }

  if (debug.enabled) {
    debug('Settings: %j', this.settings);
  }

  this.DataAccessObject = function () {
    // Dummy function
  };
}

SOAPConnector.prototype.connect = function (cb) {
  const self = this;
  if (self.client) {
    process.nextTick(function () {
      cb && cb(null, self.client);
    });
    return;
  }
  if (debug.enabled) {
    debug('Reading wsdl: %s', self.wsdl);
  }
  soap.createClient(self.wsdl, self.settings, function (err, client) {
    if (!err) {
      if (debug.enabled) {
        debug('wsdl loaded: %s', self.wsdl);
      }
      if (self.settings.security || self.settings.username) {
        let sec = null;
        const secConfig = self.settings.security || self.settings;
        if (debug.enabled) {
          debug('configuring security: %j', secConfig);
        }
        switch (secConfig.scheme) {
          case 'WS':
          case 'WSSecurity':
            sec = new soap.WSSecurity(
              secConfig.username,
              secConfig.password,
              secConfig.passwordType || secConfig.options
            );
            break;
          case 'WSSecurityCert':
            sec = new soap.WSSecurityCert(
              secConfig.privatePEM,
              secConfig.publicP12PEM,
              secConfig.password,
              secConfig.encoding
            );
            break;
          case 'ClientSSL':
            if (secConfig.pfx) {
              sec = new soap.ClientSSLSecurityPFX(
                secConfig.pfx,
                secConfig.passphrase,
                secConfig.options
              );
            } else {
              sec = new soap.ClientSSLSecurity(
                secConfig.keyPath || secConfig.key,
                secConfig.certPath || secConfig.cert,
                secConfig.ca || secConfig.caPath,
                secConfig.options);
            }
            break;
          case 'Bearer':
            sec = new soap.BearerSecurity(secConfig.token, secConfig.options);
            break;
          case 'BasicAuth':
          default:
            sec = new soap.BasicAuthSecurity(secConfig.username, secConfig.password, secConfig.options);
            break;
        }

        if (sec) {
          client.setSecurity(sec);
        }
      }

      if (self.settings.soapAction || self.settings.SOAPAction) {
        client.setSOAPAction(self.settings.soapAction || self.settings.SOAPAction);
      }

      if (Array.isArray(self.settings.soapHeaders)) {
        self.settings.soapHeaders.forEach(header => {
          if (debug.enabled) {
            debug('adding soap header: %j', header);
          }
          if (typeof header === 'object') {
            for (const item in header.element) {
              const elementValue = header.element[item];
              const xml = `<${item} xmlns="${header.namespace}">${elementValue}</${item}>`;
              client.addSoapHeader(xml);
            }
          } else if (typeof header === 'string') {
            client.addSoapHeader(header);
          }
        });
      } else if (self.settings.soapHeaders) {
        client.addSoapHeader(self.settings.soapHeaders)
      }

      client.connector = self;
      self.client = client;
      self.setupDataAccessObject();
    }
    // If the wsdl is cached, the callback from soap.createClient is sync (BUG!)
    if (cb) {
      process.nextTick(function () {
        cb(err, client);
      });
    }
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
  const methods = this.settings.operations || {};
  for (const m in methods) {
    const method = methods[m];
    if (method.service === serviceName && method.port === portName &&
      (method.operation === operationName ||
        method.operation === undefined && m === operationName)) {
      // Return the matched method name
      return m;
    }
  }

  if (dao && (operationName in dao)) {
    // The operation name exists, return full name
    return `${serviceName}_${portName}_${operationName}`;
  } else {
    return operationName;
  }
};

function setRemoting(wsMethod) {
    wsMethod.shared = true;
    wsMethod.accepts = [
        {
            arg: 'input', type: 'object', required: true,
            http: {source: 'body'}
        }
    ];
    wsMethod.returns = {arg: 'output', type: 'object', root: true};
}

function findKey(obj, val) {
  for (const n in obj) {
    if (obj[n] === val) {
      return n;
    }
  }
  return null;
}

function findMethod(client, name) {
  const services = client.wsdl.services;
  for(const s in services){
    const service = services[s];
    for (const p in service.ports) {
      const pt = service.ports[p];
      for (const op in pt.binding.operations) {
        if (op === name) {
          return pt.binding.operations[op];
        }
      }
    }
  }
  return null;
}

SOAPConnector.prototype.jsonToXML = function (method, json) {
  if (!json) {
    return '';
  }

  const client = this.client;
  client.describe();

  if (typeof method === 'string') {
    const m = findMethod(this.client, method);
    if(!m) {
      throw new Error(g.f('Method not found in WSDL port types: %s', m));
    } else {
      method = m;
    }
  }

  const {input, descriptor: {input: {body: inputDecriptor}}} = method;

  let message = '';
  if (input.message.parts) {
    message = client.xmlHandler.jsonToXml(null, null, inputDecriptor, json);
  } else if (typeof json === 'string') {
    message = json;
  } else {
    message = client.wsdl.objectToDocumentXML(input.$name, json, input.targetNSAlias, input.targetNamespace, input.$type);
  }
  return message.toString();
};

SOAPConnector.prototype.xmlToJSON = function (method, xml) {
  if(!xml) {
    return {};
  }

  if (typeof method === 'string') {
    const m = findMethod(this.client, method);
    if(!m) {
      throw new Error(g.f('Method not found in {{WSDL}} port types: %s', m));
    } else {
      method = m;
    }
  }

  const {input, output} = method;
  const json = this.client.xmlHandler.xmlToJson(null, xml);
  let root;
  let result;
  if(output.message.parts && output.message.parts.parameters && output.message.parts.parameters.element)
  {
    root = output.message.parts.parameters.element.$name;
    result = json.Body[root];
  } else if(input.message.parts && input.message.parts.parameters && input.message.parts.parameters.element)
  {
    root = input.message.parts.parameters.element.$name;
    result = json.Body[root];
  }
  // RPC/literal response body may contain elements with added suffixes I.E.
  // 'Response', or 'Output', or 'Out'
  // This doesn't necessarily equal the output message name. See WSDL 1.1 Section 2.4.5
  if(!result){
    result = json.Body[output.parent.$name.replace(/(?:Out(?:put)?|Response)$/, '')];
  }
  return result;
};

/**
 *
 * @private
 * @returns {*}
 */
SOAPConnector.prototype.setupDataAccessObject = function () {
  const self = this;
  if (this.wsdlParsed && this.DataAccessObject) {
    return this.DataAccessObject;
  }

  this.wsdlParsed = true;

  this.DataAccessObject.xmlToJSON = SOAPConnector.prototype.xmlToJSON.bind(self);
  this.DataAccessObject.jsonToXML = SOAPConnector.prototype.jsonToXML.bind(self);

  for (const s in this.client.wsdl.services) {
    const service = this.client[s];
    for (const p in service) {
      const port = service[p];
      for (const m in port) {
        const method = port[m];
        if (debug.enabled) {
          debug('Adding method: %s %s %s', s, p, m);
        }

        const methodName = this._methodName(s, p, m, this.DataAccessObject);
        if (debug.enabled) {
          debug('Method name: %s', methodName);
        }

        const wsMethod = method.bind(this.client);
        wsMethod.jsonToXML = SOAPConnector.prototype.jsonToXML.bind(self, findMethod(self.client, m));
        wsMethod.xmlToJSON = SOAPConnector.prototype.xmlToJSON.bind(self, findMethod(self.client, m));
        this.DataAccessObject[methodName] = wsMethod;
        if (this.settings.remotingEnabled) {
          setRemoting(wsMethod);
        }
      }
    }
  }
  this.dataSource.DataAccessObject = this.DataAccessObject;
  for (const model in this._models) {
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
  const m = modelDef.model.modelName;
  this._models[m] = modelDef;
};

/**
 * Get types associated with the connector
 * @returns {String[]} The types for the connector
 */
SOAPConnector.prototype.getTypes = function() {
  return ['soap'];
};

/**
 * Attempt to test the connectivity that the soap driver depends on.
 */

SOAPConnector.prototype.ping = function (cb) {
  ready(this.dataSource, function(err) {
    if (err) {
      const connectionError = new Error(g.f('NOT Connected'));
      connectionError.originalError = err;
      return cb(connectionError);
    }

    return cb();
  });
};

function ready(dataSource, cb) {
  if (dataSource.connected) {
    // Connected
    return process.nextTick(function() {
      cb();
    });
  }

  let timeoutHandle;

  function onConnected() {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    cb();
  }

  function onError(err) {
    // Remove the connected listener
    dataSource.removeListener('connected', onConnected);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    const params = [].slice.call(args);
    const cb = params.pop();
    if (typeof cb === 'function') {
      process.nextTick(function() {
        cb(err);
      });
    }
  }

  dataSource.once('connected', onConnected);
  dataSource.once('error', onError);

  // Set up a timeout to cancel the invocation
  const timeout = dataSource.settings.connectionTimeout || 60000;
  timeoutHandle = setTimeout(function() {
    dataSource.removeListener('error', onError);
    self.removeListener('connected', onConnected);
    const params = [].slice.call(args);
    const cb = params.pop();
    if (typeof cb === 'function') {
      cb(new Error(g.f('Timeout in connecting after %s ms', timeout)));
    }
  }, timeout);

  if (!dataSource.connecting) {
    dataSource.connect();
  }
}
