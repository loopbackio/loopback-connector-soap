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
    //skipping the test since external web service http://wsf.cdyne.com/WeatherWS/Weather.asmx is down for weeks and until
    //there is decision on whether we should use another external web service as a replacement.
    it.skip('should be able to derive wsdl from url', function (done) {
      var ds = loopback.createDataSource('soap',
        {
          connector: require('../index'),
          url: 'http://wsf.cdyne.com/WeatherWS/Weather.asmx' // The service endpoint
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

    //skipping the test since external web service http://wsf.cdyne.com/WeatherWS/Weather.asmx is down for weeks and until
    //there is decision on whether we should use another external web service as a replacement.
    it.skip('should be able to support remote wsdl', function (done) {
      var ds = loopback.createDataSource('soap',
        {
          connector: require('../index'),
          wsdl: 'http://wsf.cdyne.com/WeatherWS/Weather.asmx?WSDL'
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
            wsdl: path.join(__dirname, 'wsdls/weather.wsdl')
          });
        ds.on('connected', function () {
          done();
        });
      });

      it('should create models', function (done) {
        var WS = ds.createModel('WeatherService', {});

        [
          'GetCityForecastByZIP',
          'GetCityWeatherByZIP',
          'GetWeatherInformation',
        ].forEach(function(name) {
          // Short method names
          (typeof WS[name]).should.eql('function');
          // Full method names for SOAP 12 operations that conflict with the
          // simple ones
          (typeof WS['Weather_WeatherSoap12_' + name]).should.eql('function');
        })

        done();
      });

      it('should support model methods', function (done) {
        var WeatherService = ds.createModel('WeatherService', {});

        // Short method names
        WeatherService.GetCityWeatherByZIP({ZIP: '94555'}, function (err, response) {
          if (!err) {
            response.GetCityWeatherByZIPResult.Success.should.be.true;
          } else {
            //weather external web service server is often down. It's ok to have server 'Internal Server Error' 500 from the server.
            assert.equal(err.response.statusCode, 500);
          }
          done();
        });
      });

      describe('XML/JSON conversion utilities', function() {
        var sampleReq, sampleReqJson, sampleRes, sampleResJson;

        before(function() {
          function sampleDir (file) {
            return fs.readFileSync(
              path.join(__dirname, 'sample', file), 'utf-8'
            );
          }

          sampleReq = sampleDir('req.xml');
          sampleReqJson = sampleDir('req.json');
          sampleRes = sampleDir('res.xml');
          sampleResJson = sampleDir('res.json');
        });

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
        var WS = ds.createModel('WeatherService', {});

        // Operation mapped method names are defined
        (typeof WS.cityForecastByZIP).should.eql('function');
        (typeof WS.cityWeatherByZIP).should.eql('function');
        (typeof WS.weatherInfo).should.eql('function');

        [
          'GetCityForecastByZIP',
          'GetCityWeatherByZIP',
          'GetWeatherInformation',
        ].forEach(function(name) {
          // Actual method names are defined
          (typeof WS[name]).should.eql('function');
          // Full method names for SOAP 12 operations are not defined
          //  (operations method defs prevent these from being created)
          (typeof WS['Weather_WeatherSoap12_' + name]).should.eql('undefined');
        })

        done();
      });

    });

    //skipping the test since external web service http://wsf.cdyne.com/WeatherWS/Weather.asmx is down for weeks and until
    //there is decision on whether we should use another external web service as a replacement.
    describe.skip('soap invocations', function() {
      var ds;
      var WeatherService;

      before(function(done) {
        ds = loopback.createDataSource('soap',
          {
            connector: require('../index'),
            wsdl: 'http://wsf.cdyne.com/WeatherWS/Weather.asmx?WSDL', // The url to WSDL
            url: 'http://wsf.cdyne.com/WeatherWS/Weather.asmx', // The service endpoint
            // Map SOAP service/port/operation to Node.js methods
            operations: {
              // The key is the method name
              cityWeatherByZIP: {
                service: 'Weather', // The WSDL service name
                port: 'WeatherSoap', // The WSDL port name
                operation: 'GetCityWeatherByZIP' // The WSDL operation name
              },
              cityWeatherByZIP12: {
                service: 'Weather', // The WSDL service name
                port: 'WeatherSoap12', // The WSDL port name
                operation: 'GetCityWeatherByZIP' // The WSDL operation name
              }
            }
          });
        ds.on('connected', function() {
          WeatherService = ds.createModel('WeatherService',{});
          done();
        });
      });

      it('should invoke the Weather', function(done) {
        WeatherService.cityWeatherByZIP({ZIP: '94555'}, function(err, response) {
          if (!err) {
            response.GetCityWeatherByZIPResult.ResponseText.should.equal("City Found")
          } else {
            //weather external web service is often down. It's ok to have server 'Internal Server Error' 500 from the server
            assert.equal(err.response.statusCode, 500);
          }
          done();
        });
      });
      it('should invoke the Weather12', function(done) {
        WeatherService.cityWeatherByZIP12({ZIP: '48206'}, function(err, response) {
          if (!err) {
            response.GetCityWeatherByZIPResult.ResponseText.should.equal("City Found")
          } else {
            //weather external web service is often down. It's ok to have server 'Internal Server Error' 500 from the server
            assert.equal(err.response.statusCode, 500);
          }
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
        WeatherService.cityWeatherByZIP({ZIP: '94555'}, function(err, response) {
          assert.deepEqual(events, ['before execute', 'after execute']);
          if (err) { //weather external web service is often down. It's ok to have server 'Internal Server Error' 500 from the server
            assert.equal(err.response.statusCode, 500);
          }
          done();
        });
      });

    });
  });

});
