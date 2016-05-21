
function serviceIdToCurrency(serviceId) {
  return serviceId < 20000000 ? 'CZK' : 'PLN';
}

function serviceIdToCountry(serviceId) {
  return serviceId < 20000000 ? 'CZ' : 'PL';
}

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

Ember.Handlebars.helper('uppercase', function(value, options) {
  return new Ember.Handlebars.SafeString(('' + value).toUpperCase());
});

Ember.Handlebars.helper('date', function(value, options) {
  var date = new Date(value);
  return new Ember.Handlebars.SafeString(
    date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear());
});

Ember.Handlebars.helper('address', function(address, options) {
  var street_location = _join('/', address.descriptive_number, address.orientation_number);
  var line = _join(' ', address.street, street_location);
  line = _join(', byt ', line, address.apartment);
  line = _join(', ', line, _join(' ', address.postal_code, address.town));
  line = _join(', ', line, address.country);
  return new Ember.Handlebars.SafeString(line);
});

function cookie(name) {
  var value = '; ' + document.cookie;
  var parts = value.split('; ' + name + '=');
  if (parts.length == 2) return parts.pop().split(";").shift();
}

function _join() {
  var parts = Array.prototype.slice.call(arguments);
  var separator = parts.shift();
  // remove undefined or empty parts
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] === undefined || parts[i] == '') {
      parts.splice(i, 1);
      i--;
    }
  }
  return parts.join(separator);
}
