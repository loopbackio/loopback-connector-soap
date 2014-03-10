var loopback = require('loopback');

var ds = loopback.createDataSource('soap',
  {
    connector: require('../index'),
    url: 'http://www.webservicex.net/stockquote.asmx?WSDL', // The url to WSDL
    endpoint: 'http://www.webservicex.net/stockquote.asmx' // The service endpoint

  });

var StockQuote = ds.createModel('StockQuote', {});

setTimeout(function () {
  console.log(Object.keys(StockQuote));
  StockQuote.GetQuote({symbol: 'IBM'}, console.log);
}, 500);