// Copyright IBM Corp. 2014,2018. All Rights Reserved.
// Node module: loopback-connector-soap
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var fs = require('fs'),
  soap = require('strong-soap').soap,
  assert = require('assert'),
  DataSource = require('loopback-datasource-juggler').DataSource,
  path = require('path');

var test = {};
test.server = null;
test.service = {
  StockQuoteService: {
    StockQuotePort: {
      GetLastTradePrice: function (args) {
        if (args.tickerSymbol === 'trigger error') {
          throw new Error('triggered server error');
        } else {
          return { TradePrice: { price: 19.56 } };
        }
      }
    }
  }
};

describe('soap connector', function () {
  describe('http-based servers', function () {
    var http = require('http');
    before(function (done) {
      fs.readFile(__dirname + '/wsdls/stockquote.wsdl', 'utf8', function (err, data) {
        assert.ok(!err);
        test.wsdl = data;

        test.server = http.createServer(function (req, res) {
          res.statusCode = 404;
          res.end();
        });

        test.server.listen(3000, null, null, function () {
          test.soapServer = soap.listen(test.server, '/stockquote', test.service, test.wsdl);
          test.soapServer.wsdl.options.attributesKey = 'attributes';
          test.baseUrl =
            'http://' + test.server.address().address + ":" + test.server.address().port;

          test.soapServer.authenticate = function (security) {
            var created, nonce, password, user, token;
            token = security.UsernameToken, user = token.Username,
              password = token.Password.$value, nonce = token.Nonce.$value, created = token.Created;
            return user === 'test' && password === soap.passwordDigest(nonce, created, 'testpass');
          };

          test.soapServer.log = function (type, data) {
            // type is 'received' or 'replied'
          };

          done();
        });
      });
    });

    after(function (done) {
      test.server.close(function () {
        test.server = null;
        delete test.soapServer;
        test.soapServer = null;
        done();
      });
    });

    it('should supports WSSecurity', function (done) {
      var ds = new DataSource('soap',
        {
          connector: require('../index'),
          security: {
            scheme: 'WS',
            username: 'test',
            password: 'testpass',
            passwordType: 'PasswordDigest'
          },
          soapHeaders: [{
            element: { myHeader: 'XYZ' },
            prefix: 'p1',
            namespace: 'http://ns1'
          }],
          url: 'http://localhost:3000/stockquote' // The service endpoint
        });
      ds.on('connected', function () {
        var StockQuote = ds.createModel('StockQuote', {});
        StockQuote.GetLastTradePrice({ TradePriceRequest: { tickerSymbol: 'IBM' } }, function (err, quote) {
          assert.equal(quote.price, '19.56');
          done(err);
        });
      });
    });

    it('should reject bad username/password with WSSecurity', function (done) {
      var ds = new DataSource('soap',
        {
          connector: require('../index'),
          security: {
            scheme: 'WS',
            username: 'test',
            password: 'wrongpass',
            passwordType: 'PasswordDigest'
          },
          url: 'http://localhost:3000/stockquote' // The service endpoint
        });
      ds.on('connected', function () {
        var StockQuote = ds.createModel('StockQuote', {});
        StockQuote.GetLastTradePrice({ TradePriceRequest: { tickerSymbol: 'IBM' } }, function (err, quote) {
          assert(err);
          done();
        });
      });
    });

    // FIXME: [rfeng] node-soap module doesn't support BasicAuth on the server side yet
    /*
    it('should supports BasicAuthSecurity', function (done) {
      var ds = loopback.createDataSource('soap',
        {
          connector: require('../index'),
          security: {
            scheme: 'BasicAuth',
            username: 'test',
            password: 'testpass'
          },
          url: 'http://localhost:3000/stockquote' // The service endpoint
        });
      ds.on('connected', function () {
        var StockQuote = ds.createModel('StockQuote', {});
        StockQuote.GetLastTradePrice({tickerSymbol: 'IBM'}, function (err, quote) {
          assert.equal(quote.price, '19.56');
          done(err);
        });
      });
  
    });
    */

    it('should supports soap headers', function (done) {
      var ds = new DataSource('soap',
        {
          connector: require('../index'),
          security: {
            scheme: 'WS',
            username: 'test',
            password: 'testpass',
            passwordType: 'PasswordDigest'
          },
          soapHeaders: [{
            element: { myHeader: 'XYZ' },
            prefix: 'p1',
            namespace: 'http://ns1'
          }],
          url: 'http://localhost:3000/stockquote' // The service endpoint
        });
      ds.on('connected', function () {
        var StockQuote = ds.createModel('StockQuote', {});
        StockQuote.GetLastTradePrice({ TradePriceRequest: { tickerSymbol: 'IBM' } }, function (err, quote) {
          assert.equal(quote.price, '19.56');
          done(err);
        });
      });
    });
  });

  describe('https-based servers', function () {
    var https = require('https');
    var certPath = path.resolve(__dirname, 'fixtures', 'test-certificate2.pfx');
    before(function (done) {
      fs.readFile(__dirname + '/wsdls/stockquote.wsdl', 'utf8', function (err, data) {
        assert.ok(!err);
        test.wsdl = data;

        // FIXME(kjdelisle): We probably shouldn't be using the same cert...
        test.server = https.createServer({
          pfx: fs.readFileSync(certPath),
          passphrase: 'abc123',
          rejectUnauthorized: false,
          requestCert: true,
        }, function (req, res) {
          res.statusCode = 404;
          res.end();
        });

        test.server.listen(3000, null, null, function () {
          test.soapServer = soap.listen(test.server, '/stockquote', test.service, test.wsdl);
          test.soapServer.wsdl.options.attributesKey = 'attributes';
          test.baseUrl = 'https://' + test.server.address().address + ":" + test.server.address().port;

          test.soapServer.log = function (type, data) {
            // type is 'received' or 'replied'
          };

          done();
        });
      });
    });

    after(function (done) {
      test.server.close(function () {
        test.server = null;
        delete test.soapServer;
        test.soapServer = null;
        done();
      });
    });
    it('should support ClientSSL with PFX', function (done) {
      var ds = new DataSource('soap',
        {
          connector: require('../index'),
          security: {
            scheme: 'ClientSSL',
            pfx: certPath,
            passphrase: 'abc123',
            username: 'test',
            password: 'testpass',
            passwordType: 'PasswordDigest',
          },
          requestOptions: {
            rejectUnauthorized: false,
          },
          soapHeaders: [{
            element: { myHeader: 'XYZ' },
            prefix: 'p1',
            namespace: 'http://ns1'
          }],
          url: 'https://localhost:3000/stockquote' // The service endpoint
        });
      ds.on('connected', function () {
        var StockQuote = ds.createModel('StockQuote', {});
        StockQuote.GetLastTradePrice({ TradePriceRequest: { tickerSymbol: 'IBM' } },
          function (err, quote) {
            assert.equal(quote.price, '19.56');
            done(err);
          });
      });
    });
  });
});
