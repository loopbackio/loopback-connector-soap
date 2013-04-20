var soap = require('soap');
  var url = 'http://www.webservicex.net/stockquote.asmx?wsdl';
  var args = {'tns:symbol': 'IBM'};
  soap.createClient(url, function(err, client) {
      client.GetQuote(args, function(err, result) {
          console.log(result);
      });
  });
