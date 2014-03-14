var loopback = require('loopback');

var ds = loopback.createDataSource('soap',
  {
    connector: require('../index'),
    url: 'http://www.webservicex.net/stockquote.asmx?WSDL', // The url to WSDL
    endpoint: 'http://www.webservicex.net/stockquote.asmx', // The service endpoint

    // Map SOAP service/port/operation to Node.js methods
    operations: {
      // The key is the method name
      stockQuote: {
        service: 'StockQuote', // The WSDL service name
        port: 'StockQuoteSoap', // The WSDL port name
        operation: 'GetQuote' // The WSDL operation name
      },
      // The key is the method name
      stockQuote12: {
        service: 'StockQuote', // The WSDL service name
        port: 'StockQuoteSoap12', // The WSDL port name
        operation: 'GetQuote' // The WSDL operation name
      }
    }
  });

// Unfortunately, the methods from the connector are mixed in asynchronously
// This is a hack to wait for the methods to be injected
ds.once('connected', function () {
// Create the model
  var StockQuote = ds.createModel('StockQuote', {});

  StockQuote.stockQuote({symbol: 'IBM'}, function (err, response) {
    console.log('Response: ', response);
  });

  StockQuote.stockQuote12({symbol: 'FB'}, function (err, response) {
    console.log('Response: ', response);
  });


});