var jayson = require('easysoap');
var url = require('url');

/**
 * Export the initialize method to loopback-datasource-juggler
 * @param dataSource
 * @param callback
 */
exports.initialize = function initializeDataSource(dataSource, callback) {
    var settings = dataSource.settings || {};

    var connector = new SOAPConnector(settings);
    connector.getDataAccessObject();

    dataSource.connector = connector;
    dataSource.connector.dataSource = dataSource;

    for (var f in connector.DataAccessObject) {
        dataSource[f] = connector.DataAccessObject[f];
    }

    connector.init(callback);
};


/**
 * The SOAPConnector constructor
 * @param options
 * @constructor
 */
function SOAPConnector(options) {
    if (options.baseURL) {
        var parts = url.parse(options.baseURL);
        parts['host'] = parts['host'].split(':')[0];
        for (var p in parts) {
            if (!options.hasOwnProperty(p)) {
                options[p] = parts[p];
            }
        }
    }
    if (options.debug) {
        console.log('Options: ', options);
    }
    this.options = options;

    var clientParams = {

        //set soap connection data (mandatory values)
        host: options.host,
        path: options.path,
        wsdl: options.wsdl

        /*
         //set soap header (optional)
         header  : [{
         'name'      : 'item_name',
         'value'     : 'item_value',
         'namespace' : 'item_namespace'
         }]
         */
    };

    //soap client options
    var clientOptions = {
        secure: options.secure //is https or http
    };

    //create new soap client
    this.client = new easySoap.Client(clientParams, clientOptions);

}

/**
 * @private
 * @param cb
 */
SOAPConnector.prototype.init = function(cb) {
    this.client.init();
    this.client.once('initialized', cb);
};

/**
 * @private
 * @param op
 * @returns {Function}
 */
SOAPConnector.prototype.mapOperation = function (op) {
    var fn = function () {
        var args = Array.prototype.slice.call(arguments);
        var cb = null;
        if (args.length > 0 && typeof args[args.length - 1] === 'function') {
            cb = args.pop();
        }

        this.client.once(op, function(data, header) {
            //soap response
            cb && cb(null, data, header);
        });

        this.client.call({
            'method' : op,
            'params' : args
        });
    };
    return fn;
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
    var self = this;
    var DataAccessObject = function () {
    };
    self.DataAccessObject = DataAccessObject;

    self.options.operations.forEach(function (op) {
        if (self.options.debug) {
            console.log('Mixing in method: ', op);
        }
        self.DataAccessObject[op] = self.mapOperation(op);
    });
    return self.DataAccessObject;
};

