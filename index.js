var request = require('request');

module.exports = class CMP {

  constructor( options = {} ) {
    this.user = options.user;
    this.pass = options.pass;
    this.host = options.host;
    this.port = options.port;

    if (options.rejectUnauthorized === undefined) {
      this.rejectUnauthorized = true;
    } else this.rejectUnauthorized = Boolean(options.rejectUnauthorized);

  }

  auth() {
    return "Basic " + Buffer(this.user + ":" + this.pass).toString("base64");
  }

  url( resource = '', params = {} ) {

    var url = this.host;
    if (this.port) url += ':' + this.port;

    switch (resource) {
      case 'departments':
        url += '/userAction.php?action=GetDepartments';
      break;
      case 'catalog':
        url += '/userAction.php?action=GetPreApprovedChanges&status_ids=2';
      break;
      case 'environments':
        url += '/userAction.php?action=GetEnvironments';
      break;
      case 'types':
        url += '/userAction.php?action=GetRequestTypes';
      break;
      case 'statuses':
        url += '/userAction.php?action=GetRequestStatuses';
      break;
      case 'users':
        url += '/userAction.php?action=GetUsers';
      break;
      case 'user':
        url += '/userAction.php?action=GetUsers';
      break;
      case 'hosts':
        url += '/userAction.php?action=GetHosts&type=paginated&rows=999';
      break;
      case 'requests':
        url += '/requests.json';
      break;

      default:
        url += resource;
        break;
    }

    return url;

  }

  normalizer( resource = '' ) {

    try {
      return require('./normalizers/' + resource + 'Normalizer');
    }
    catch(err) {
      return false;
    }

  }


  get( resource = '', params = {} ) {

    var promise, normalizer = this.normalizer(resource);

    promise = new Promise( (resolve, reject) => {

      var options = {
        url: this.url(resource),
        method: 'get',
        json: true,
        qs: params,
        rejectUnauthorized: this.rejectUnauthorized,
        headers: {
          "Authorization" : this.auth()
        }
      };

      request(options, function(error, response, body) {

        if(error) reject(error);
        if(body && body.error) reject(body.error);

        var output = {}, entry, key;

        // convert array to map and normalize
        if (resource == 'hosts') {
          output = body.rows;
        }
        else{
          for (key in body) {

            entry = body[key];
            if (normalizer) entry = normalizer(entry);
            output[entry.id] = entry;

          }
        }

        resolve(output);

      });


    } );

    return promise;

  }

  post( resource = '', params = {} ) {

    var promise, normalizer = this.normalizer(resource);

    promise = new Promise( (resolve, reject) => {

      var options = {
        url: this.url(resource),
        method: 'post',
        json: true,
        formData: params,
        rejectUnauthorized: false,
        headers: {
          "Authorization" : this.auth()
        }
      };

      request(options, function(error, response, body) {
        if(error) reject(error);
        if(body && body.error) reject(body.error);
        resolve(body);

      });


    } );

    return promise;

  }

  put( resource = '', params = {} ) {

    var promise, normalizer = this.normalizer(resource);

    promise = new Promise( (resolve, reject) => {

      var options = {
        url: this.url(resource),
        method: 'put',
        json: true,
        form: params,
        rejectUnauthorized: false,
        headers: {
          "Authorization" : this.auth()
        }
      };

      console.log(options);

      request(options, function(error, response, body) {
        if(error) reject(error);
        
        if(body && body.error) reject(body.error);

        console.log(body);

        resolve(body);

      });


    } );

    return promise;

  }

}