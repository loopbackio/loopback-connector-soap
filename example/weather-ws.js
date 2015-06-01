var loopback = require('loopback');

var ds = loopback.createDataSource('soap',
  {
    connector: require('../index'),
    wsdl: 'http://wsf.cdyne.com/WeatherWS/Weather.asmx?WSDL' // The url to WSDL
  });

// Unfortunately, the methods from the connector are mixed in asynchronously
// This is a hack to wait for the methods to be injected
ds.once('connected', function () {

  // Set up a before-execute hook to dump out the request object
  ds.connector.observe('before execute', function(ctx, next) {
    console.log('Http Request: ', ctx.req);
    next();
  });

// Create the model
  var WeatherService = ds.createModel('WeatherService', {});

  WeatherService.GetCityForecastByZIP({ZIP: '94555'}, function (err, response) {
    console.log('Forecast: %j', response);
  });

  WeatherService.GetCityWeatherByZIP({ZIP: '94555'}, function (err, response) {
    console.log('Weather: %j', response);
  });

  WeatherService.GetWeatherInformation(function (err, response) {
    console.log('Info: %j', response);
  });

});
