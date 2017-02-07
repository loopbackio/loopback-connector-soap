// Copyright IBM Corp. 2014,2015. All Rights Reserved.
// Node module: loopback-connector-soap
// US Government Users Restricted Rights - Use, duplication or disclosure
// restricted by GSA ADP Schedule Contract with IBM Corp.

var should = require('should');
var loopback = require('loopback');
var path = require('path');
var fs = require('fs');
var assert = require('assert');

describe('soap connector', function () {
  describe('wsdl configuration', function () {

    it('should be able to derive wsdl from url', function (done) {
      var ds = loopback.createDataSource('soap',
        {
          connector: require('../index'),
          url: 'http://www.webservicex.net/stockquote.asmx' // The service endpoint
        });
      ds.on('connected', function () {
        ds.connector.should.have.property('client');
        ds.connector.client.should.have.property('wsdl');
        done();
      });
    });

    it('should be able to support local wsdl', function (done) {
      var ds = loopback.createDataSource('soap',
        {
          connector: require('../index'),
          wsdl: path.join(__dirname, 'wsdls/weather.wsdl')
        });
      ds.on('connected', function () {
        ds.connector.should.have.property('client');
        ds.connector.client.should.have.property('wsdl');
        done();
      });
    });

    it('should be able to support remote wsdl', function (done) {
      var ds = loopback.createDataSource('soap',
        {
          connector: require('../index'),
          wsdl: 'http://www.webservicex.net/stockquote.asmx?WSDL'
        });
      ds.on('connected', function () {
        ds.connector.should.have.property('client');
        ds.connector.client.should.have.property('wsdl');
        done();
      });
    });
  });

  describe('models', function () {
    describe('models without remotingEnabled', function () {
      var ds;
      before(function (done) {
        ds = loopback.createDataSource('soap',
          {
            connector: require('../index'),
            wsdl: path.join(__dirname, 'wsdls/stockquote_external.wsdl')
          });
        ds.on('connected', function () {
          done();
        });
      });

      it('should create models', function (done) {
        var StockQuote = ds.createModel('StockQuoteService', {});

        // Short method names
        (typeof StockQuote.GetQuote).should.eql('function');
        // Full method names for SOAP 12 operations that conflict with the simple ones
        (typeof StockQuote.StockQuote_StockQuoteSoap12_GetQuote).should.eql('function');

        done();
      });

      it('should support model methods', function (done) {
        var StockQuoteService = ds.createModel('StockQuoteService', {});

        // Short method names
        StockQuoteService.GetQuote({symbol: 'IBM'}, function (err, response) {
          console.log("response: " + response.GetQuoteResult);
          var index = response.GetQuoteResult.indexOf('<StockQuotes><Stock><Symbol>IBM</Symbol><Last>');
          //StockQoute external webservice sends 'exception' rarely as a response.  This is not a problem with connector code. This happens even when we use
          //web service client provided by them, http://www.webservicex.net/New/Home/ServiceDetail/9  Hence below check accounts for this.
          if (index === -1) {
            index = response.GetQuoteResult.indexOf('exception');
          }
          assert.ok(index > -1);
          done();
        });
      });

    });

    describe('XML/JSON conversion utilities', function() {
      var ds;
      before(function (done) {
        sampleReq = fs.readFileSync(path.join(__dirname, 'sample-req.xml'), 'utf-8');
        sampleReqJson = fs.readFileSync(path.join(__dirname, 'sample-req.json'), 'utf-8');
        sampleRes = fs.readFileSync(path.join(__dirname, 'sample-res.xml'), 'utf-8');
        sampleResJson = fs.readFileSync(path.join(__dirname, 'sample-res.json'), 'utf-8');
        ds = loopback.createDataSource('soap',
            {
              connector: require('../index'),
              wsdl: path.join(__dirname, 'wsdls/weather.wsdl')
            });
        ds.on('connected', function () {
          done();
        });
      });
      var sampleReq, sampleReqJson, sampleRes, sampleResJson;

      it('should support xmlToJSON methods', function () {
        var WeatherService = ds.createModel('WeatherService', {});
        assert.equal(typeof WeatherService.xmlToJSON, 'function');
        assert.equal(typeof WeatherService.GetCityForecastByZIP.xmlToJSON, 'function');

        var json = WeatherService.xmlToJSON('GetCityForecastByZIP', sampleReq);
        assert.deepEqual(json, JSON.parse(sampleReqJson));

        json = WeatherService.GetCityForecastByZIP.xmlToJSON(sampleReq);
        assert.deepEqual(json, JSON.parse(sampleReqJson));

        json = WeatherService.GetCityForecastByZIP.xmlToJSON(sampleRes);
        assert.deepEqual(json, JSON.parse(sampleResJson));
      });

      it('should support jsonToXML methods', function () {
        var WeatherService = ds.createModel('WeatherService', {});
        assert.equal(typeof WeatherService.jsonToXML, 'function');
        assert.equal(typeof WeatherService.GetCityForecastByZIP.jsonToXML, 'function');
        var xml = WeatherService.jsonToXML('GetCityForecastByZIP', JSON.parse(sampleReqJson));
        assert.equal(xml, '<ns1:GetCityForecastByZIP ' +
            'xmlns:ns1="http://ws.cdyne.com/WeatherWS/"' +
            '><ns1:ZIP>95131</ns1:ZIP>' +
            '</ns1:GetCityForecastByZIP>');

        xml = WeatherService.GetCityForecastByZIP.jsonToXML(JSON.parse(sampleReqJson));
        assert.equal(xml, '<ns1:GetCityForecastByZIP ' +
            'xmlns:ns1="http://ws.cdyne.com/WeatherWS/"' +
            '><ns1:ZIP>95131</ns1:ZIP>' +
            '</ns1:GetCityForecastByZIP>');
      });
    });


    describe('models with remotingEnabled', function () {
      var ds;
      before(function (done) {
        ds = loopback.createDataSource('soap',
          {
            connector: require('../index'),
            remotingEnabled: true,
            wsdl: path.join(__dirname, 'wsdls/weather.wsdl')
          });
        ds.on('connected', function () {
          done();
        });
      });

      it('should create models', function (done) {
        var WeatherService = ds.createModel('WeatherService', {});

        // Short method names
        (typeof WeatherService.GetCityForecastByZIP).should.eql('function');
        WeatherService.GetCityForecastByZIP.shared.should.be.true;
        // Full method names for SOAP 12 operations that conflict with the simple ones
        (typeof WeatherService.Weather_WeatherSoap12_GetWeatherInformation).should.eql('function');
        WeatherService.Weather_WeatherSoap12_GetWeatherInformation.shared.should.be.true;

        done();
      });

    });

    describe('models with operations', function(){
      var ds;
      before(function (done) {
        ds = loopback.createDataSource('soap',
          {
            connector: require('../index'),
            wsdl: path.join(__dirname, 'wsdls/weather.wsdl'),
            operations : {
                weatherInfo: {
                    service : 'Weather',
                    port    : 'WeatherSoap',
                    operation : 'GetWeatherInformation'
                },
                cityForecastByZIP: {
                    service : 'Weather',
                    port    : 'WeatherSoap',
                    operation : 'GetCityForecastByZIP'
                },
                cityWeatherByZIP: {
                    service : 'Weather',
                    port    : 'WeatherSoap',
                    operation : 'GetCityWeatherByZIP'
                }
            }
          });
        ds.on('connected', function () {
          done();
        });
      });

      it('should create mapped methods for operations', function (done) {
        var WeatherService = ds.createModel('WeatherService', {});

        // Operation mapped method names are defined
        (typeof WeatherService.cityForecastByZIP).should.eql('function');
        (typeof WeatherService.cityWeatherByZIP).should.eql('function');
        (typeof WeatherService.weatherInfo).should.eql('function');

        // Actual method names are defined
        (typeof WeatherService.GetCityForecastByZIP).should.eql('function');
        (typeof WeatherService.GetCityWeatherByZIP).should.eql('function');
        (typeof WeatherService.GetWeatherInformation).should.eql('function');
        
        // Full method names for SOAP 12 operations are not defined  (operations method defs prevent these from being created)
        (typeof WeatherService.Weather_WeatherSoap12_GetWeatherInformation).should.eql('undefined');
        (typeof WeatherService.Weather_WeatherSoap12_GetCityForecastByZIP).should.eql('undefined');
        (typeof WeatherService.Weather_WeatherSoap12_GetCityWeatherByZIP).should.eql('undefined');

        done();
      });

    });


    describe('soap invocations', function() {
      var ds;
      var StockQuoteService;

      before(function(done) {
        ds = loopback.createDataSource('soap',
          {
            connector: require('../index'),
            wsdl: 'http://www.webservicex.net/stockquote.asmx?WSDL', // The url to WSDL
            url: 'http://www.webservicex.net/stockquote.asmx', // The service endpoint
            // Map SOAP service/port/operation to Node.js methods
            operations: {
              // The key is the method name
              getQuote: {
                service: 'StockQuote', // The WSDL service name
                port: 'StockQuoteSoap', // The WSDL port name
                operation: 'GetQuote' // The WSDL operation name
              },
              getQuote12: {
                service: 'StockQuote', // The WSDL service name
                port: 'StockQuoteSoap12', // The WSDL port name
                operation: 'GetQuote' // The WSDL operation name
              }
            }
          });
        ds.on('connected', function() {
          StockQuote = ds.createModel('StockQuoteService',{});
          done();
        });
      });

      it('should invoke the getQuote', function(done) {
        StockQuote.getQuote({symbol: 'IBM'}, function(err, response) {
          //check  server response - can't check for stock price since it varies, just check for first part of the response
          var index = response.GetQuoteResult.indexOf('<StockQuotes><Stock><Symbol>IBM</Symbol><Last>');
          console.log("response: " + response.GetQuoteResult);
          //StockQoute external webservice sends 'exception' rarely as a response. This is not a problem with connector code. This happens even when we use web
          //service client provided by them, http://www.webservicex.net/New/Home/ServiceDetail/9  Hence below check accounts for this.
          if (index === -1) {
            index = response.GetQuoteResult.indexOf('exception');
          }
          assert.ok(index > -1);
          done();
        });
      });
      it('should invoke the getQuote12', function(done) {
        StockQuote.getQuote12({symbol: 'IBM'}, function(err, response) {
          console.log("response: " + response.GetQuoteResult);
          //check  server response - can't check for stock price since it varies, just check for first part of the response
          var index = response.GetQuoteResult.indexOf('<StockQuotes><Stock><Symbol>IBM</Symbol><Last>');
          //StockQoute external webservice sends 'exception' rarely as a response. This is not a problem with connector code. This happens even when we use web service
          //client provided by them, http://www.webservicex.net/New/Home/ServiceDetail/9  Hence below check accounts for this.
          if (index === -1) {
            index = response.GetQuoteResult.indexOf('exception');
          }
          assert.ok(index > -1);
          done();
        });
      });

      it('should invoke hooks', function(done) {
        var events = [];
        var connector = ds.connector;
        connector.observe('before execute', function(ctx, next) {
          assert(ctx.req);
          events.push('before execute');
          next();
        });
        connector.observe('after execute', function(ctx, next) {
          assert(ctx.res);
          events.push('after execute');
          next();
        });
        StockQuote.getQuote({symbol: 'IBM'}, function(err, response) {
          assert.deepEqual(events, ['before execute', 'after execute']);
          done();
        });
      });

    });
  });

});
