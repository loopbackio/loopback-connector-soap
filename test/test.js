// Copyright IBM Corp. 2014,2018. All Rights Reserved.
// Node module: loopback-connector-soap
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

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
          url: 'http://ws.cdyne.com/emailverify/Emailvernotestemail.asmx' // The service endpoint
        });
      ds.on('connected', function () {
        ds.connector.should.have.property('client');
        ds.connector.client.should.have.property('wsdl');
        return done();
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
        return done();
      });
    });

    it('should be able to support remote wsdl', function (done) {
      var ds = loopback.createDataSource('soap',
        {
          connector: require('../index'),
          wsdl: 'http://ws.cdyne.com/emailverify/Emailvernotestemail.asmx?wsdl'
        });
      ds.on('connected', function () {
        ds.connector.should.have.property('client');
        ds.connector.client.should.have.property('wsdl');
        return done();
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
            wsdl: path.join(__dirname, 'wsdls/emailvernotestemail_external.wsdl')
          });
        ds.on('connected', function () {
          return done();
        });
      });

      it('should create models', function (done) {
        var Emailvernotestemail = ds.createModel('EmailvernotestemailService', {});
        // Short method names
        (typeof Emailvernotestemail.VerifyMXRecord).should.eql('function');
        // Full method names for SOAP 12 operations that conflict with the simple ones
        (typeof Emailvernotestemail.EmailVerNoTestEmail_EmailVerNoTestEmailSoap12_VerifyMXRecord).should.eql('function');

        return done();
      });

      it('should support model methods', function (done) {
        var EmailvernotestemailService = ds.createModel('EmailvernotestemailService', {});

        EmailvernotestemailService.VerifyMXRecord({
          email: 'test@email.com',
          LicenseKey: 0
        }, function (err, response) {
          assert.ok(typeof response.VerifyMXRecordResult === 'number');
          return done();
        });
      });

      it('should support model methods as promises', function (done) {
        var EmailvernotestemailService = ds.createModel('EmailvernotestemailService', {});

        EmailvernotestemailService.VerifyMXRecord({
          email: 'test@email.com',
          LicenseKey: 0
        }).then(function (response) {
          assert.ok(typeof response.result.VerifyMXRecordResult === 'number');
          return done();
        }, done);
      });
    });

    describe('XML/JSON conversion utilities', function () {
      var ds;
      var sampleReq, sampleReqJson, sampleRes, sampleResJson;
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
          return done();
        });
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
          return done();
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

        return done();
      });
    });

    describe('models with operations', function () {
      var ds;
      before(function (done) {
        ds = loopback.createDataSource('soap',
          {
            connector: require('../index'),
            wsdl: path.join(__dirname, 'wsdls/weather.wsdl'),
            operations: {
              weatherInfo: {
                service: 'Weather',
                port: 'WeatherSoap',
                operation: 'GetWeatherInformation'
              },
              cityForecastByZIP: {
                service: 'Weather',
                port: 'WeatherSoap',
                operation: 'GetCityForecastByZIP'
              },
              cityWeatherByZIP: {
                service: 'Weather',
                port: 'WeatherSoap',
                operation: 'GetCityWeatherByZIP'
              }
            }
          });
        ds.on('connected', function () {
          return done();
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

        return done();
      });
    });

    describe('soap invocations', function () {
      var ds;
      var EmailvernotestemailService;

      before(function (done) {
        ds = loopback.createDataSource('soap',
          {
            connector: require('../index'),
            wsdl: 'http://ws.cdyne.com/emailverify/Emailvernotestemail.asmx?wsdl', // The url to WSDL
            url: 'http://ws.cdyne.com/emailverify/Emailvernotestemail.asmx', // The service endpoint
            // Map SOAP service/port/operation to Node.js methods
            operations: {
              // The key is the method name
              verifyMXRecord: {
                service: 'EmailVerNoTestEmail', // The WSDL service name
                port: 'EmailVerNoTestEmailSoap', // The WSDL port name
                operation: 'VerifyMXRecord' // The WSDL operation name
              },
              verifyMXRecord2: {
                service: 'EmailVerNoTestEmail', // The WSDL service name
                port: 'EmailVerNoTestEmailSoap12', // The WSDL port name
                operation: 'VerifyMXRecord' // The WSDL operation name
              }
            }
          });
        ds.on('connected', function () {
          EmailvernotestemailService = ds.createModel('EmailvernotestemailService', {});
          return done();
        });
      });

      it('should invoke the verifyMXRecord', function (done) {
        EmailvernotestemailService.verifyMXRecord({
          email: 'test@email.com',
          LicenseKey: 0
        }, function (err, response) {
          assert.ok(typeof response.VerifyMXRecordResult === 'number');
          return done();
        });
      });

      it('should invoke the verifyMXRecord2', function (done) {
        EmailvernotestemailService.verifyMXRecord2({
          email: 'test@email.com',
          LicenseKey: 0
        }, function (err, response) {
          assert.ok(typeof response.VerifyMXRecordResult === 'number');
          return done();
        });
      });

      it('should invoke hooks', function (done) {
        var events = [];
        var connector = ds.connector;
        connector.observe('before execute', function (ctx, next) {
          assert(ctx.req);
          events.push('before execute');
          return next();
        });
        connector.observe('after execute', function (ctx, next) {
          assert(ctx.res);
          events.push('after execute');
          return next();
        });
        EmailvernotestemailService.verifyMXRecord({
          email: 'test@email.com',
          LicenseKey: 0
        }, function () {
          assert.deepEqual(events, ['before execute', 'after execute']);
          return done();
        });
      });
    });
  });
});
