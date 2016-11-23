"use strict";

var request = require('request');
var Q = require('q');
var moment = require('moment-timezone');
var co = require('co');

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
        if (resource == 'hosts' && body) {
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

      request(options, function(error, response, body) {
        if(error) reject(error);
        
        if(body && body.error) reject(body.error);

        resolve(body);

      });


    } );

    return promise;

  }

  generateCMR( data ) {

    var deferred = Q.defer(); // Q is used because it has progress callback
    var self = this;

    if (!data['environment_id']) deferred.reject('missing environment_id');
    if (!data['requesttype_id']) deferred.reject('missing requesttype_id');
    if (!data['department_id']) deferred.reject('missing department_id');
    if (!data['preapprovedchange_id']) deferred.reject('missing preapprovedchange_id');

    co(function* () {

      yield [];

      var hostgroups = data.hostgroups;
      data.hostgroups = 0; // number of CMR hostgroups to be created by default

      deferred.notify('Creating CMR: ' + data['summary']); 
      var cmr_id = yield self.post('requests', data);
      cmr_id = cmr_id.requestID[0];
      deferred.notify('SUCCESS: ' + cmr_id); 


      // create hostgroups
      var units_cache = {}; // { unit_name: unit_state } - cache of updated units
      for ( var hostgroup of hostgroups ) {

        deferred.notify('Creating hostgroup: ' + hostgroup['target-value']);
        var hostgroup_id = yield self.post('/requests/' + cmr_id + '/hostgroups', hostgroup);
        hostgroup_id = hostgroup_id.hostgroupID[0];
        deferred.notify('SUCCESS: ' + hostgroup_id);

        if (hostgroup['target-value']) {
          deferred.notify('Getting hosts');
          var hosts = yield self.get('hosts', {
            filters: '{"groupOp":"AND","rules":[{"field":"hostname","op":"bw","data":"' + hostgroup['target-value'] + '"}]}'
          });

          hosts = hosts.map( (el) => { return el.id} ).join(',');
          deferred.notify('SUCCESS: ' + hosts);

          deferred.notify('Applying hosts to hostgroup');
          var units = yield self.put('/requests/' + cmr_id + '/hostgroups/' + hostgroup_id, { 'affected-hosts': hosts });
          units = units.hostSummary.units;
          deferred.notify('SUCCESS. Units are: ' + Object.keys(units) );

        }

        if (hostgroup['unit-state-id'] && units) {

          for (var unit in units){

            if ( !units_cache[unit] || units_cache[unit] != hostgroup['unit-state-id'] ) {
              deferred.notify('Updating unit state: ' + unit + ' -> ' + hostgroup['unit-state-id']);
              var updateUnits = yield self.put('/requests/' + cmr_id + '/unit/' + units[unit].id + '.json', {
                'unit-state-id': hostgroup['unit-state-id']
              });
              deferred.notify('SUCCESS');
              units_cache[unit] = hostgroup['unit-state-id'];
            }

          }

        }

      }

    })
    .then( () => {deferred.resolve()})
    .catch( (err) => {deferred.reject(err)})

    return deferred.promise;

  }

}