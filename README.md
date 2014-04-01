# loopback-connector-soap

Loopback's SOAP based Web Services Connector

# Configure the SOAP data source

    var ds = loopback.createDataSource('soap', {
        connector: 'loopback-connector-soap'
        remotingEnabled: true,
        wsdl: 'http://wsf.cdyne.com/WeatherWS/Weather.asmx?WSDL'
    });

## Options

- url: url to the SOAP web service endpoint, if not present, the `location`
attribute of the soap address for the service/port. For example,

```xml
    <wsdl:service name="Weather">
        <wsdl:port name="WeatherSoap" binding="tns:WeatherSoap">
            <soap:address location="http://wsf.cdyne.com/WeatherWS/Weather.asmx" />
        </wsdl:port>
        ...
    </wsdl:service>
```

- wsdl: url or path to the wsdl file, if not present, defaults to <url>?wsdl

- remotingEnabled: indicates if the operations will be further exposed as REST
APIs

- operations: maps WSDL binding operations to Node.js methods

```json
    operations: {
      // The key is the method name
      stockQuote: {
        service: 'StockQuote', // The WSDL service name
        port: 'StockQuoteSoap', // The WSDL port name
        operation: 'GetQuote' // The WSDL operation name
      },
      stockQuote12: {
        service: 'StockQuote', // The WSDL service name
        port: 'StockQuoteSoap12', // The WSDL port name
        operation: 'GetQuote' // The WSDL operation name
      }
    }
```

# Create a model from the SOAP data source
```js
    ds.once('connected', function () {

        // Create the model
        var WeatherService = ds.createModel('WeatherService', {});

        ...
    }
```

# Extend a model to wrap/mediate SOAP operations

Once the model is defined, it can be wrapped or mediated to define new methods.
The following example simplifies the `GetCityForecastByZIP` operation to a method
that takes `zip` and returns an array of forecasts.

```js

    // Refine the methods
    WeatherService.forecast = function (zip, cb) {
        WeatherService.GetCityForecastByZIP({ZIP: zip || '94555'}, function (err, response) {
            console.log('Forecast: %j', response);
            var result = (!err && response.GetCityForecastByZIPResult.Success) ?
            response.GetCityForecastByZIPResult.ForecastResult.Forecast : [];
            cb(err, result);
        });
    };
```

The custom method on the model can be exposed as REST APIs. It uses the `loopback.remoteMethod`
to define the mappings.

```js

    // Map to REST/HTTP
    loopback.remoteMethod(
        WeatherService.forecast, {
            accepts: [
                {arg: 'zip', type: 'string', required: true,
                http: {source: 'query'}}
            ],
            returns: {arg: 'result', type: 'object', root: true},
            http: {verb: 'get', path: '/forecast'}
        }
    );

```