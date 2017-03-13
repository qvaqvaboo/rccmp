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
        url += '/userAction.php?action=GetUser';
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
        withCredentials: true,
        headers: {}
      };

      if (this.user) options.headers["Authorization"] = this.auth()

      request(options, function(error, response, body) {

        if(error) reject(error);
        if(body && body.error) reject(body);

        // exceptions
        if (resource === 'hosts' && body) body = body.rows;

        // normalize
        if (normalizer) {
          if ( Array.isArray(body) ) body = body.map( (el) => { return normalizer(el) });
          else if ( typeof body === 'object' ) body = normalizer(body);
        }

        resolve(body);

      });


    } );

    return promise;

  }

  post( resource = '', params = {} ) {

    var promise, normalizer = this.normalizer(resource);

    promise = new Promise( (resolve, reject) => {

      var options = {
        url: this.url(resource),
        method: 'POST',
        json: true,
        body: Object.keys(params).map( (e) => {
          return e + '=' + encodeURIComponent(params[e])
        }).join('&').replace(/ /g, "+"),

        rejectUnauthorized: false,
        withCredentials: true,
        headers: {
          "Content-Type" : "application/x-www-form-urlencoded"
        }
      };

      if (this.user) options.headers["Authorization"] = this.auth()

      request(options, function(error, response, body) {
        if(error) reject(error);
        if(body && body.error) reject(body);
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
        method: 'PUT',
        json: true,
        body: Object.keys(params).map( (e) => {
          return e + '=' + params[e]
        }).join('&').replace(/ /g, "+"),
        rejectUnauthorized: false,
        withCredentials: true,
        headers: {
          "Content-Type" : "application/x-www-form-urlencoded"
        }
      };

      if (this.user) options.headers["Authorization"] = this.auth()

      request(options, function(error, response, body) {
        if(error) reject(error);
        
        if(body && body.error) reject(body);

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
    var cmr_id;

    co(function* () {

      yield [];

      var hostgroups = data.hostgroups;
      data.hostgroups = 0; // number of CMR hostgroups to be created by default

      // convert usernames to user IDs
      var usersSet = new Set( data['internal-resources-users-id'].split(',') );
      var usersMap = {};
      usersSet.add( data['owner-id'] );
      usersSet.add( data['sponsor-id'] );
      usersSet.add( data['executor-id'] );
      for (var user of usersSet.values() ) {
        if (!user) continue;
        if (parseInt(user)) continue;
        user = user.trim();
        deferred.notify('Searching CMP user id for: ' + user); 
        var foo = yield self.get('users', {q: user})
        if (!foo[0]) continue;
        if (!foo[0].id) continue;
        deferred.notify('Searching CMP user id SUCCESS: ' + foo[0].id);
        usersMap[ user ] = foo[0].id;
      }

      if ( data['owner-id'] && !parseInt( data['owner-id'] ) ) data['owner-id'] = usersMap[ data['owner-id'] ];
      if ( data['executor-id'] && !parseInt( data['executor-id'] ) ) data['executor-id'] = usersMap[ data['executor-id'] ];
      if ( data['sponsor-id'] && !parseInt( data['sponsor-id'] ) ) data['sponsor-id'] = usersMap[ data['sponsor-id'] ];

      if ( data['internal-resources-users-id'] ) {
        data['internal-resources-users-id'] = data['internal-resources-users-id'].split(',')
        .map( el => {
          if (parseInt(el)) return parseInt(el);
          if (typeof el === 'string' && usersMap[el.trim()]) return usersMap[el.trim()];
          return '';
        } ).join(',');
      }

      // clear undefined properties
      Object.keys(data).forEach( key => {if(data[key] === undefined) delete data[key]} )

      // create CMR
      deferred.notify('Creating CMR: ' + data['summary']); 
      cmr_id = yield self.post('requests', data);
      if (!cmr_id.requestID) deferred.reject(cmr_id);
      cmr_id = cmr_id.requestID[0];
      deferred.notify('SUCCESS: ' + cmr_id); 


      // create hostgroups
      var units_cache = {}; // { unit_name: unit_state } - cache of updated units
      for ( var hostgroup of hostgroups ) {

        deferred.notify('Creating hostgroup: ' + hostgroup['target-value']);
        var hostgroup_id = yield self.post('/requests/' + cmr_id + '/hostgroups', hostgroup);
        hostgroup_id = hostgroup_id.hostgroupID[0];
        deferred.notify('Creating hostgroup: ' + hostgroup['target-value'] + ' SUCCESS');

        deferred.notify('Updating hostgroup target-value');
        yield self.put(`/requests/${cmr_id}/hostgroups/${hostgroup_id}`, {"target-value": hostgroup['target-value']});
        deferred.notify('Updating hostgroup target-value SUCCESS');

        if (hostgroup['target-value']) {
          deferred.notify('Getting hosts');
          var hosts = yield self.get('hosts', {
            filters: '{"groupOp":"AND","rules":[{"field":"hostname","op":"bw","data":"' + hostgroup['target-value'] + '"}]}'
          });

          if (hosts) hosts = hosts.map( (el) => { return parseInt(el.id)} ).join(',');
          deferred.notify('Getting hosts SUCCESS: ' + hosts);

          deferred.notify('Applying hosts to hostgroup');
          var units = yield self.put('/requests/' + cmr_id + '/hostgroups/' + hostgroup_id, { 'affected-hosts': hosts || '' });
          console.log(units);
          units = units.hostSummary ? units.hostSummary.units : {};
          deferred.notify('Applying hosts to hostgroup SUCCESS. Units are: ' + Object.keys(units) );

        }

        if (hostgroup['unit-state-id'] && units) {

          for (var unit in units){

            if ( !units_cache[unit] || units_cache[unit] != hostgroup['unit-state-id'] ) {
              deferred.notify('Updating unit state: ' + unit + ' -> ' + hostgroup['unit-state-id']);
              var updateUnits = yield self.put('/requests/' + cmr_id + '/unit/' + units[unit].id + '.json', {
                'unit-state-id': hostgroup['unit-state-id']
              });
              deferred.notify('Updating unit state : ' + unit + ' -> ' + hostgroup['unit-state-id'] + ' SUCCESS');
              units_cache[unit] = hostgroup['unit-state-id'];
            }

          }

        }

      }

    })
    .then( () => {deferred.resolve(cmr_id)})
    .catch( (err) => {deferred.reject(err)})

    return deferred.promise;

  }

}