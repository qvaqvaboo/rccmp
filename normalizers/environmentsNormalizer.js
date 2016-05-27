"use strict";

module.exports = function( entry ) {

  var output;

  output = {
    id: entry.id,
    title: entry.title,
    name: entry.name,
    'maintenance-start': entry['maintenance-start'],
    'maintenance-end': entry['maintenance-end'],
    'time-zone': entry['time-zone']
  }

  return output;

}