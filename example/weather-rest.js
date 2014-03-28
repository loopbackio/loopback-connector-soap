var loopback = require('loopback');
var app = module.exports = loopback();

app.set('restApiRoot', '/api');

var ds = loopback.createDataSource('soap',
  {
    connector: require('../index'),
    remotingEnabled: true,
    wsdl: 'http://wsf.cdyne.com/WeatherWS/Weather.asmx?WSDL' // The url to WSDL
  });

// Unfortunately, the methods from the connector are mixed in asynchronously
// This is a hack to wait for the methods to be injected
ds.once('connected', function () {

  // Create the model
  var WeatherService = ds.createModel('WeatherService', {});

  // Refine the methods
  WeatherService.forecast = function(zip, cb) {
    WeatherService.GetCityForecastByZIP({ZIP: zip || '94555'}, function (err, response) {
      console.log('Forecast: %j', response);
      var result = response.GetCityForecastByZIPResult.ForecastResult.Forecast;
      cb(err, result);
    });
  };

  WeatherService.weather = function(zip, cb) {
    WeatherService.GetCityWeatherByZIP({ZIP: zip || '94555'}, function (err, response) {
      console.log('Weather: %j', response);
      // var result = response.GetCityWeatherByZIPResult.Temperature;
      var result = response;
      cb(err, result);
    });
  };

  // Map to REST/HTTP
  loopback.remoteMethod(
    WeatherService.forecast, {
      accepts: [
        {arg: 'zip', type: 'string', required: true,
          http: {source: 'query'}}
      ],
      returns: {arg: 'result', type: 'object', root: true},
      http: {verb: 'get', path: '/forcast'}
    }
  );

  loopback.remoteMethod(
    WeatherService.weather, {
      accepts: [
        {arg: 'zip', type: 'string', required: true,
          http: {source: 'query'}}
      ],
      returns: {arg: 'result', type: 'object', root: true},
      http: {verb: 'get', path: '/weather'}
    }
  );

  // Expose to REST
  app.model(WeatherService);

  // LoopBack REST interface
  app.use(app.get('restApiRoot'), loopback.rest());
// API explorer (if present)
  try {
    var explorer = require('loopback-explorer')(app);
    app.use('/explorer', explorer);
    app.once('started', function(baseUrl) {
      console.log('Browse your REST API at %s%s', baseUrl, explorer.route);
    });
  } catch(e){
    console.log(
      'Run `npm install loopback-explorer` to enable the LoopBack explorer'
    );
  }

  app.use(loopback.urlNotFound());
  app.use(loopback.errorHandler());

  if(require.main === module) {
    app.start();
  }

});

app.start = function() {
  return app.listen(3000, function() {
    var baseUrl = 'http://127.0.0.1:3000';
    app.emit('started', baseUrl);
    console.log('LoopBack server listening @ %s%s', baseUrl, '/');
  });
};



