"use strict";

module.exports = function( entry ) {

  var output, key;

  output = {
    id: entry.id,
    title: entry.title,
    is_change_department: entry.is_change_department,
    director: (entry.director ? entry.director.id : null),
    managers: [],
    delegate_directors: []
  }

  for (key in entry.managers) {
    output.managers.push( entry.managers[key].id );
  }

  for (key in entry.delegate_directors) {
    output.delegate_directors.push( entry.delegate_directors[key].id );
  }

  return output;

}