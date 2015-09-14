function putJSON(url, body) {
  return new Ember.RSVP.Promise(function(resolve, reject) {
    Ember.$.ajax({
      type: 'PUT',
      url: url,
      data: JSON.stringify(body, null, 2),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      success: function(data) { resolve(data); },
      error: function(err) { reject(err.responseJSON.errors); }
    });
  });
}

function postJSON(url, body) {
  return new Ember.RSVP.Promise(function(resolve, reject) {
    Ember.$.ajax({
      type: 'POST',
      url: url,
      data: JSON.stringify(body, null, 2),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      success: function(data) { resolve(data); },
      error: function(err) { reject(err.responseJSON.errors); }
    });
  });
}

function deleteJSON(url, body) {
  return new Ember.RSVP.Promise(function(resolve, reject) {
    Ember.$.ajax({
      type: 'DELETE',
      url: url,
      data: JSON.stringify(body, null, 2),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      success: function(data) { resolve(data); },
      error: function(err) { reject(err.responseJSON.errors); }
    });
  });
}

Ember.Handlebars.helper('date', function(value, options) {
  var date = new Date(value);
  return new Ember.Handlebars.SafeString(
    date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear());
});

function cookie(name) {
  var value = '; ' + document.cookie;
  var parts = value.split('; ' + name + '=');
  if (parts.length == 2) return parts.pop().split(";").shift();
}
