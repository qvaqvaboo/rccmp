var CMP = require('./index');

var cmp = new CMP({host: 'http://localhost', user: 'test', pass: 'test'});
var catalog = cmp.get('users', {q: 'vadim'});


catalog.then( function(body) {
  console.log( body );
} );

catalog.catch( function(error) {
  console.log( error );
});