Ember.Handlebars.helper ('truncate', function (str, len) {
  if (str && str.length > len && str.length > 0) {
      var new_str = str + " ";
      new_str = str.substr (0, len);
      new_str = str.substr (0, new_str.lastIndexOf(" "));
      new_str = (new_str.length > 0) ? new_str : str.substr (0, len);

      return new Ember.Handlebars.SafeString ( new_str +'...' ); 
  }
  return str;
});

function decodeInput(input) {
  return Ember.$('<textarea />').html(input).text();
}

Ember.Handlebars.helper('gps', function(cord) {
  if (!cord) {
    return '';
  }
  pair = cord.constructor === Array ? cord : cord.replace(',', '').split(' ');
  if (!pair[0] || !pair[1]) {
    return '';
  }
  pair = normalizeGps(pair);
  var lat = pair[0] < 0 ? (pair[0] * -1) + 'S' : pair[0] + 'N';
  var lon = pair[1] < 0 ? (pair[1] * -1) + 'W' : pair[1] + 'E';
  return new Ember.Handlebars.SafeString(lat + ' ' + lon);
});

function normalizeGps(gps) {
  return (gps && gps.length === 2) ? [roundTo5Dec(gps[0]), roundTo5Dec(gps[1])] : [];
}

function roundTo5Dec(num) {
  return Math.round(num * 100000) / 100000;
}

function parseDmsLocation(input) {
  var coors = String(input).trim().split(/[^\dNSEW.'"°*-]+/i);
  var lat, lon;
  switch (coors.length) {
    case 2:
      lat = coors[0];
      lon = coors[1];
      break;
    case 4:
      if (/[NSEW]{2}/i.test(coors[0]+coors[2])) {
        lat = coors[1] + coors[0];
        lon = coors[3] + coors[2];
      }
      break;
  }
  return [parseDms(lat), parseDms(lon)];

  function parseDms(dmsInput) {
    if (dmsInput === null || dmsInput === undefined) {
      return NaN;
    }
    if (typeof dmsInput === 'number' && isFinite(dmsInput)) {
      return Number(dmsInput);
    }
    var dms = String(dmsInput).trim()
                .replace(/^-/, '')
                .replace(/[NSEW]$/i, '')
                .split(/[^\d.]+/);
    if (dms[dms.length - 1] === '') {
      dms.splice(dms.length - 1);
    }
    var deg = null;
    switch (dms.length) {
      case 3:
        deg = dms[0]/1 + dms[1]/60 + dms[2]/3600;
        break;
      case 2:
        deg = dms[0]/1 + dms[1]/60;
        break;
      case 1:
        deg = dms[0];
        break;
      default:
        return NaN;
    }
    if (/^-|[WS]$/i.test(dmsInput.trim())) {
      deg = -deg;
    }
    return Number(deg);
  }
}

function applicationVersion(application, fullVersion) {
    var 
      separator = fullVersion.indexOf('+'),
      shortVersion = fullVersion.substring(0, separator),
      commit = fullVersion.substring(separator + 1),
      commitUrl = 'https://github.com/silesnet/' + application + '/commit/' + commit;
    return {
      application: application,
      full: fullVersion,
      short: shortVersion,
      commit: commit,
      commitUrl: commitUrl
    };
}

function serviceName(service) {
  return _join(' ', service.name, _join('/', service.download, service.upload), 'Mbps');
}

function countryCodeToName(code) {
  switch (code) {
    case 'cz':
    case 'CZ':
    case 'cs':
    case 'CS':
      return 'Česká republika';
    case 'pl':
    case 'PL':
      return 'Polska';
    default:
      return '';
  }
}

function countryIdToName(id) {
  switch (id) {
    case 10:
      return 'Česká republika';
    case 20:
      return 'Polska';
    default:
      return '';
  }
}

function toTimestamp(date) {
  return  toDate(date) + ' @' + toTime(date);
}

function toDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  return date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear();
}

function toTime(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  return leftPadNum(date.getHours(), 2) + ':' + 
    leftPadNum(date.getMinutes(), 2) + ':' + 
    leftPadNum(date.getSeconds(), 2);
}

function leftPadNum(num, len) {
  return ('0000000000' + num).slice(-len);
}

function serviceProtocol(hasDhcp, hasPppoe, serviceName) {
  var
    dhcp = hasDhcp ? 'dhcp' : '',
    pppoe = hasPppoe ? 'pppoe' : '',
    protocol = _join('_', dhcp, pppoe);
  if (/^.*max min.$/.test(serviceName)) {
    return 'dhcp';
  }
  return protocol ? protocol : 'static';
}

function servcieIdToAgreement(serviceId) {
  return parseInt((serviceId % 10000000) / 100);
}

function serviceChannel(serviceName, pppoeMode) {
  var name = serviceName.toLowerCase();
  pppoeMode = pppoeMode ? pppoeMode.toLowerCase : '';
  if (name.substring(0, 8) === 'wireless' ||
       (name.substring(0, 8) === 'internet' && pppoeMode === 'wireless')) {
    return 'wireless';
  }
  return 'lan';
}

function serviceToPppoeMode(serviceId, serviceName) {
  var name = serviceName.toLowerCase(),
    country = serviceIdToCountry(serviceId);
  if (country === 'PL') {
    if (name.substr(0, 3) === 'lan') {
      return 'LAN';
    } else {
      return 'WIRELESS';
    }
  } else {
    if (name.substr(0, 8) === 'wireless') {
      return 'WIRELESS';
    } else if (name.substr(0, 3) === 'lan' && name !== 'lanfiber') {
      return 'LAN';
    } else {
      return 'FIBER';
    }
  }
}

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

Ember.Handlebars.helper('stamp', function(value, options) {
  var date = new Date(value);
  return new Ember.Handlebars.SafeString(
    date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear()) +
    ' @' + digits(date.getHours(), 2) + ':' + digits(date.getMinutes(), 2);
});

function digits(number, digits) {
  number = '' + number;
  if (digits <= number.length) {
    return number;
  }
  return '0000000000'.substring(0, digits - number.length) + number;
}

Ember.Handlebars.helper('address', function(address, options) {
  return new Ember.Handlebars.SafeString(draftAddress(address));
});

Ember.Handlebars.helper('todoStatus', function(code, options) {
  var status = '';
  switch(code) {
    case 0:
      status = 'New';
      break;
    case 1:
      status = 'In Progress';
      break;
    case 2:
      status = 'Completed';
      break;
    case 3:
      status = 'Archived';
      break;
    default:
      status = 'Unknown';
      break;
  }
  return new Ember.Handlebars.SafeString(status);
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
  return _join(', ', customer.street, _join(' ', customer.postal_code, customer.city));
}

function serviceAddress(address) {
  if (!address) {
    return '';
  }
  var street = _join(' ', address.street, _join('/', address.descriptive_number, address.orientation_number));
  var post = _join(' ', address.postal_code, address.town);
  var country = countryCodeToName(address.country);
  var serviceAddress = _join(', ', street, post, country);
  return country === serviceAddress ? '' : serviceAddress;
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
