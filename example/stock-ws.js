var loopback = require('loopback');

var ds = loopback.createDataSource('soap',
  {
    connector: require('../index'),
    url: 'http://www.webservicex.net/stockquote.asmx?WSDL', // The url to WSDL
    endpoint: 'http://www.webservicex.net/stockquote.asmx' // The service endpoint

  });

// Unfortunately, the methods from the connector are mixed in asynchronously
// This is a hack to wait for the methods to be injected
ds.once('connected', function () {
// Create the model
  var StockQuote = ds.createModel('StockQuote', {});

  StockQuote.GetQuote({symbol: 'IBM'}, function (err, response) {
    console.log('Response: ', response);
  });

});