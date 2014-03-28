# loopback-connector-soap

Loopback's SOAP based Web Services Connector

# Configure the SOAP data source

    var ds = loopback.createDataSource('soap', {
        connector: 'loopback-connector-soap'
        remotingEnabled: true,
        wsdl: 'http://wsf.cdyne.com/WeatherWS/Weather.asmx?WSDL'
    });

# Create a model from the SOAP data source

    ds.once('connected', function () {

        // Create the model
        var WeatherService = ds.createModel('WeatherService', {});

        ...
    }
