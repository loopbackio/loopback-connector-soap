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

    it('should be able to support remote wsdl', function (done) {
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
        var WeatherService = ds.createModel('WeatherService', {});

        // Short method names
        (typeof WeatherService.GetCityForecastByZIP).should.eql('function');
        (typeof WeatherService.GetCityWeatherByZIP).should.eql('function');
        (typeof WeatherService.GetWeatherInformation).should.eql('function');

        // Full method names for SOAP 12 operations that conflict with the simple ones
        (typeof WeatherService.Weather_WeatherSoap12_GetWeatherInformation).should.eql('function');
        (typeof WeatherService.Weather_WeatherSoap12_GetCityForecastByZIP).should.eql('function');
        (typeof WeatherService.Weather_WeatherSoap12_GetCityWeatherByZIP).should.eql('function');

        done();
      });

      it('should support model methods', function (done) {
        var WeatherService = ds.createModel('WeatherService', {});

        // Short method names
        WeatherService.GetCityWeatherByZIP({ZIP: '94555'}, function (err, response) {
          should.not.exist(err);
          response.GetCityWeatherByZIPResult.Success.should.be.true;
          done();
        });
      });

      describe('XML/JSON conversion utilities', function() {
        var sampleReq, sampleReqJson, sampleRes, sampleResJson;

        before(function() {
          sampleReq = fs.readFileSync(path.join(__dirname, 'sample-req.xml'), 'utf-8');
          sampleReqJson = fs.readFileSync(path.join(__dirname, 'sample-req.json'), 'utf-8');
          sampleRes = fs.readFileSync(path.join(__dirname, 'sample-res.xml'), 'utf-8');
          sampleResJson = fs.readFileSync(path.join(__dirname, 'sample-res.json'), 'utf-8');
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
          assert.equal(xml, '<tns:GetCityForecastByZIP' +
            ' xmlns:tns="http://ws.cdyne.com/WeatherWS/" xmlns="http://ws.cdyne.com/WeatherWS/">' +
            '<tns:ZIP>95131</tns:ZIP></tns:GetCityForecastByZIP>');

          xml = WeatherService.GetCityForecastByZIP.jsonToXML(JSON.parse(sampleReqJson));
          assert.equal(xml, '<tns:GetCityForecastByZIP' +
            ' xmlns:tns="http://ws.cdyne.com/WeatherWS/" xmlns="http://ws.cdyne.com/WeatherWS/">' +
            '<tns:ZIP>95131</tns:ZIP></tns:GetCityForecastByZIP>');
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
  });

});
