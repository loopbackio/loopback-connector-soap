# loopback-connector-soap

The SOAP connector enables LoopBack applications to interact with
[SOAP](http://www.w3.org/TR/soap)-based web services described using
[WSDL](http://www.w3.org/TR/wsdl).

<p class="gh-only">
For more information, see the
<a href="http://loopback.io/doc/en/lb3/SOAP-connector.html">LoopBack documentation</a>.
</p>

## Installation

In your application root directory, enter:

```shell
$ npm install loopback-connector-soap --save
```

This will install the module from npm and add it as a dependency to the application's 
[package.json](http://loopback.io/doc/en/lb2/package.json.html) file.

## Using the SOAP CLI

The LoopBack command-line tool includes a command to generate (discover) models based on SOAP web service.  Use this command, `lb soap` to automatically create a set of models based on a SOAP service WSDL file.  For more information, see [SOAP generator](http://loopback.io/doc/en/lb3/SOAP-generator.html).

## Creating a data source

Use the [Data source generator](http://loopback.io/doc/en/lb2/Data-source-generator.html) to add a SOAP data source to your application.

With the API Connect toolkit:

```shell
$ apic create --type datasource
```

With LoopBack tools:

```shell
$ lb loopback:datasource
```

Choose "SOAP webservices" as the data source type when prompted.

## SOAP data source properties

The following table describes the SOAP data source properties you can set in `datasources.json`.

<table>
<thead>
<tr>
<th>Property</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>    
<tr>
<td>url</td>
<td>String</td>
<td>URL to the SOAP web service endpoint. If not present, defaults to the
<code>location</code> attribute of the SOAP address for the service/port
from the WSDL document; for example:
<pre><code><wsdl:service name="periodictable">
<wsdl:port name="periodictableSoap" binding="tns:periodictableSoap">
<soap:address location="http://www.webservicex.net/periodictable.asmx"/>
</wsdl:port>
</wsdl:service></code></pre>
</td>
</tr>
<tr>
<td>wsdl</td>
<td>String</td>
<td>HTTP URL or local file system path to the WSDL file. Default is <code>?wsdl</code>.</td>
</tr>
<tr>
<td>wsdl_options</td>
<td>Object</td>
<td>Indicates additonal options to pass to the SOAP connector, for example allowing self signed certificates.
For example:
<pre><code>wsdl_options: {
  rejectUnauthorized: false,
  strictSSL: false,
  requestCert: true,
}</code></pre></td>    
</tr>
<tr>
<td>remotingEnabled</td>
<td>Boolean</td>
<td>Indicates whether the operations are exposed as REST APIs. To expose or hide a specific method, override with:
<pre><code>&lt;Model&gt;.&lt;method&gt;.shared = true | false;</code></pre>
</td>
</tr>
<tr>
<td>operations</td>
<td>Object</td>
<td>Maps WSDL binding operations to Node.js methods. Each key in the JSON
object becomes the name of a method on the model.
See <a href="#operations-property">operations property</a> below.</td>
</tr>
<tr>
<td>security</td>
<td>Object</td>
<td>security configuration.
See <a href="#security-property">security property</a> below.
</td>
</tr>
<tr>
<td>soapHeaders</td>
<td>Array of objects.</td>
<td>Custom SOAP headers. An array of header properties.
 For example:
<pre><code>soapHeaders: [{
element: {myHeader: 'XYZ'}, // The XML element in JSON object format
  prefix: 'p1', // The XML namespace prefix for the header
  namespace: 'http://ns1' // The XML namespace URI for the header
}]</code></pre>
</td>       
</tr>
</tbody>
</table>

### operations property

The `operations` property value is a JSON object that has a property (key) for each
method being defined for the model. The corresponding value is an object with the
following properties:

| Property | Type | Description |
|---|---|---|
| service | String | WSDL service name |
| port | String | WSDL port name |
| operation | String | WSDL operation name |

Here is an example operations property for the periodic table service:

```javascript
operations: {
  // The key is the method name
  stockQuote: {
    service: 'periodictable', // The WSDL service name
    port: 'periodictableSoap', // The WSDL port name
    operation: 'GetAtomicNumber' // The WSDL operation name
  }
}
```

### security property

The `security` property value is a JSON object with a `scheme` property.
The other properties of the object depend on the value of `scheme`.  For example:

```javascript
security: {
    scheme: 'WS',
    username: 'test',
    password: 'testpass',
    passwordType: 'PasswordDigest'
}
```

<table>
  <tbody>
   <tr>
    <th>Scheme</th>
    <th>Description</th>
    <th>Other properties</th>    
   </tr>

   <tr>
    <td>WS</td>
    <td>WSSecurity scheme</td>
    <td>
    <ul>
     <li>username: the user name</li>
     <li>password: the password</li>
     <li>passwordType: default is 'PasswordText'</li>
    </ul>
    </td>    
   </tr>

   <tr>
    <td>BasicAuth</td>
    <td>Basic auth scheme</td>
    <td>    
    <ul>
     <li>username: the user name</li>
     <li>password: the password</li>
    </ul>
    </td>    
   </tr>

   <tr>
    <td>ClientSSL</td>
    <td>ClientSSL scheme</td>
    <td>
     <ul>
     <li>keyPath: path to the private key file</li>
     <li>certPath: path to the certificate file</li>
    </ul>    
    </td>    
   </tr>

  </tbody>
</table>

## Example datasource.json

A complete example datasource.json:

```javascript
{
  "soapDS": {
    "url": "http://www.webservicex.net/periodictable.asmx",
    "name": "soapDS",
    "wsdl": "http://www.webservicex.net/periodictable.asmx?WSDL",
    "remotingEnabled": true,
    "connector": "soap"
    "operations": {
      "periodicTable": {
        "service": "periodicTable",
        "port": "soap_periodictableSoap",
        "operation": "GetAtomicNumber"
      }
    }
  }
}
```

## Creating a model from a SOAP data source

The SOAP connector loads WSDL documents asynchronously.
As a result, the data source won't be ready to create models until it's connected.
The recommended way is to use an event handler for the 'connected' event; for example:

```javascript
module.exports = function(periodictableperiodictableSoap) {

  var soapDataSource = server.datasources.soapDS;
  var periodictableperiodictableSoap;

  soapDataSource.once('connected', function () {
    // Create the model
    periodictableperiodictableSoap = soapDataSource.createModel('periodictableperiodictableSoap', {});
  });
  ...
}
```

## Extending a model to wrap and mediate SOAP operations

You can extend a LoopBack model to wrap or mediate SOAP operations
and define new methods.
The following example simplifies the `GetCityForecastByZIP` operation to a method
that takes `zip` and returns an array of forecasts.

```javascript
periodictableperiodictableSoap.GetAtomicNumber = function(GetAtomicNumber, callback) {
    periodictableperiodictableSoap.GetAtomicNumber(GetAtomicNumber, function (err, response) {
      var result = response;
      callback(err, result);
    });
}
```

To expose the custom method on the model as a REST API,
use `loopback.remoteMethod` to define the mappings.

```javascript
periodictableperiodictableSoap.remoteMethod('GetAtomicWeight',
{ isStatic: true,
produces:
 [ { produces: 'application/json' },
   { produces: 'application/xml' } ],
accepts:
 [ { arg: 'GetAtomicWeight',
     type: 'GetAtomicWeight',
     description: 'GetAtomicWeight',
     required: true,
     http: { source: 'body' } } ],
returns:
 [ { arg: 'data',
     type: 'GetAtomicWeightResponse',
     description: 'GetAtomicWeightResponse',
     root: true } ],
http: { verb: 'post', path: '/GetAtomicWeight' },
description: 'GetAtomicWeight' }
);
```

## Use boot script to create model and expose APIs to API Explorer

The SOAP connector builds operations from WSDL asynchronously.
To expose such methods over REST, you need to do the following with a boot script,
such as `server/a-soap.js`:

```javascript
var server = require('../server'); // Require all models defined in server dir

module.exports = function(periodictableperiodictableSoap) {

  var soapDataSource = server.datasources.soapDS;
  var periodictableperiodictableSoap;

  soapDataSource.once('connected', function () {
    // Create the model
    periodictableperiodictableSoap = soapDataSource.createModel('periodictableperiodictableSoap', {});
  });
```

## Examples

See [loopback-example-connector]
(https://github.com/strongloop/loopback-example-connector/tree/soap).  The repository provides examples in the `soap` branch.
