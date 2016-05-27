"use strict";

module.exports = function( entry ) {

  var output;

  output = {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    'request-type-id': (entry.request_type ? entry.request_type.id : null),
    'department-id': (entry.department ? entry.department.id : null)
  }

  return output;

}