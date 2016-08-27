function generatePassword(length) {
  var iteration = 0;
  var password = "";
  var randomNumber;
  while(iteration < length){
    randomNumber = (Math.floor((Math.random() * 100)) % 94) + 33;
    if ((randomNumber >=33) && (randomNumber <=47)) { continue; }
    if ((randomNumber >=58) && (randomNumber <=64)) { continue; }
    if ((randomNumber >=91) && (randomNumber <=96)) { continue; }
    if ((randomNumber >=123) && (randomNumber <=126)) { continue; }
    iteration++;
    password += String.fromCharCode(randomNumber);
  }
  return password;
}

function normalizePhoneNumber(number, country) {
  var prefix = country === 'CZ' ? '420' : (country === 'PL' ? '48' : ''),
  numbers;
  number = number.replace(/ /g, '');
  numbers = number.split(',');
  for (var i = 0; i < numbers.length; i++) {
    numbers[i] = '+' + prefix + numbers[i];
  }
  return numbers.join(', ');
}

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
      error: function(err) { reject(Ember.get(err, 'responseJSON.errors')); }
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
      error: function(err) { reject(Ember.get(err, 'responseJSON.errors')); }
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
  return new Ember.Handlebars.SafeString(draftAddress(address));
});

function draftAddress(data) {
  var street_location = _join('/', data.descriptive_number, data.orientation_number);
  var address = _join(' ', data.street, street_location);
  address = _join(', byt ', address, data.apartment);
  address = _join(', ', address, _join(' ', data.postal_code, data.town));
  address = _join(', ', address, data.country);
  return address;
}

function customerDraftName(data) {
  return data.customer_type === '1' ? (data.name + ' ' + data.surname) : data.supplementary_name;
}

function customerAddress(customer) {
  return customer.street + ', ' + customer.postal_code + ' ' + customer.city;
}

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
    if (parts[i] === undefined || parts[i] === '') {
      parts.splice(i, 1);
      i--;
    }
  }
  return parts.join(separator);
}
