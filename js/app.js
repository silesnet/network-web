var App = Ember.Application.create({
  rootElement: '#app',
  // LOG_RESOLVER: true
});

Ember.deprecate = () => {};

App.Router.map(function() {
  this.route('services', { path: '/services' }, function() {});
  this.route('service', { path: '/services/:service_id' }, function() {
    this.route('print');
  });
  this.route('service-errors', { path: '/service-errors' }, function() {});
  this.route('changelog', { path: '/changelog' }, function() {});
});

Ember.Application.initializer({
  name: 'status',
  initialize: function(container, application) {
    application.register('service:status', application.Status, { singleton: true });
    application.inject('controller', 'status', 'service:status');
    Ember.$.getJSON('http://localhost:8090/status/version')
    .then(function(data) {
      var status = container.lookup('service:status');
      status.set('serviceFullVersion', data.version);
    });
  }
});

Ember.Application.initializer({
  name: 'flash-messages',
  initialize: function(container, application) {
    application.register('service:flash-messages', application.FlashMessagesService, { singleton: true });
    application.inject('controller', 'flashes', 'service:flash-messages');
    application.inject('route', 'flashes', 'service:flash-messages');
  }
});

Ember.Application.initializer({
  name: 'session',
  initialize: function(container, application) {
    App.deferReadiness();
    application.register('service:session', application.Session, { singleton: true });
    application.inject('controller', 'session', 'service:session');
    application.inject('route', 'session', 'service:session');
    var sessionId = cookie('JSESSIONID') || 'test';
    Ember.$.getJSON('http://localhost:8090/users/current?session=' + sessionId)
    .then(function(data) {
      var session = container.lookup('service:session');
      session.configure(data.users);
      App.advanceReadiness();
    });
  }
});

App.ApplicationRoute = Ember.Route.extend({
  actions: {
    openModal: function(name, model) {
      var form = {}, controller;
      if (name.substring(0, 4) === 'form') {
        Ember.set(model, 'form', Ember.copy(model, true));
      }
      controller = this.controllerFor(name);
      if (controller.initModal) {
        controller.initModal(model);
      }
      return this.render(name, {
        into: 'application',
        outlet: 'modal',
        model: model
      });
    },
    closeModal: function() {
      return this.disconnectOutlet({
        outlet: 'modal',
        parentView: 'application'
      });
    },
    confirm: function () {
        var $btn, $confirm, el, height, offset, width;
        el = this.get('element');
        $btn = $('.btn-delete', el);
        offset = $btn.offset();
        $confirm = $btn.next();
        height = $confirm.outerHeight();
        width = $confirm.outerWidth();
        $confirm.css('top', offset.top - height - 20);
        $confirm.css('left', offset.left - width / 2 + 45);
        return $confirm.fadeIn();
    },
    cancel: function () {
        var $confirm, el;
        el = this.get('element');
        $confirm = $('.delete-confirm', el);
        return $confirm.fadeOut();
    }
  }
});

App.ServicesRoute = Ember.Route.extend({
  actions: {
    didTransition() {
      Ember.run.scheduleOnce('afterRender', this, function() {
        $('.autofocus').focus();
      });
    }
  }
});

App.ServiceRoute = Ember.Route.extend({
  model: function(params) {
    return Ember.$.getJSON('http://localhost:8090/services/' + params.service_id)
      .then(function(service) {
        if (!service.data) {
          service.data = "{\"devices\": []}";
        }
        service.data = JSON.parse(service.data);
        if (!service.data.devices) {
          service.data.devices = [];
        }
        return Ember.RSVP.hash({
          service: service,
          customer: Ember.$.getJSON('http://localhost:8090/customers/' + service.customer_id)
            .then(function(customer) { return customer.customer; }),
          dhcp: Ember.$.getJSON('http://localhost:8090/services/' + params.service_id + '/dhcp')
            .then(function(dhcp) {
              if (dhcp.dhcp.network_id && dhcp.dhcp.network_id > 0) {
                return Ember.$.getJSON('http://localhost:8090/networks/devices/' + dhcp.dhcp.network_id)
                  .then(function(device) {
                    dhcp.dhcp['switch'] = device.devices;
                    return dhcp.dhcp;
                  });
              } else {
                return dhcp.dhcp;
              }
            }),
          dhcp_wireless: Ember.$.getJSON('http://localhost:8090/services/' + params.service_id + '/dhcp-wireless')
            .then(function(res) { return res.dhcp_wireless; }),
          pppoe: Ember.$.getJSON('http://localhost:8090/services/' + params.service_id + '/pppoe')
            .then(function(pppoe) { return pppoe.pppoe; }),
          customer_draft: new Ember.RSVP.Promise(function(resolve, reject) {
            if (service.is_draft && !service.has_customer) {
              Ember.$.getJSON('http://localhost:8090/drafts2/customers/' + service.customer_id)
                .then(function(draft) { resolve(draft.drafts); }, function(error) {
                  resolve({}); // draft with existing customer
                });
            } else {
              resolve({});
            }
          }),
          todos: Ember.$.getJSON('http://localhost:8090/services/' + params.service_id + '/todos')
            .then(function(result) { return result.todos; }),
          events: Ember.$.getJSON('http://localhost:8090/events/?entity=services&entityId=' + params.service_id)
            .then(function(result) { return result.data; })
        });
      });
  },
  setupController: function(controller, model) {
    var login = model.pppoe.login;
    var hasPppoe = model.pppoe.service_id ? true : false;
    var hasDhcpWireless = model.dhcp_wireless.service_id ? true : false;
    controller.set('model', model);
    controller.set('model.lastPppoeIp', {});
    controller.set('model.lastDhcpWirelessIp', {});
    if (hasPppoe) {
      Ember.$.getJSON('http://localhost:8090/networks/pppoe/' + login + '/last-ip')
        .then(function(response) {
            var ipResolved = false,
              lastIp = {};
            Ember.A(response.lastIp).forEach(function(auth, index) {
              if (!ipResolved && auth.address) {
                if (index === 0) {
                  lastIp.isOnline = true;
                }
                lastIp.ip = auth.address;
                lastIp.dateValue = auth.date || null;
                lastIp.timestamp = toTimestamp(lastIp.dateValue);
                ipResolved = true;
              }
            });
            controller.set('model.lastPppoeIp', lastIp);
          }, function(err) { controller.set('model.lastPppoeIp', {});} );
    }
    if (hasDhcpWireless) {
      Ember.$.getJSON('http://localhost:8090/networks/dhcp-wireless/' + model.dhcp_wireless.service_id + '/connection')
        .then(function(response) {
            controller.set('model.dhcpWirelessConnection', response.connection || {});
          }, function(err) { controller.set('model.dhcpWirelessConnection', {});} );
    }

  },
  events: {
    reload: function() {
      this.refresh();
    }
  }
});

App.ServiceErrorsRoute = Ember.Route.extend({
  model: function() {
    return Ember.RSVP.hash({
      conflicts: Ember.$.getJSON('http://localhost:8090/services/conflicting-authentications')
        .then(function(result) { return result.services; })
    });
  } 
});

App.ChangelogRoute = Ember.Route.extend({
  model: function() {
    return Ember.$.getJSON('https://api.github.com/repos/silesnet/silesnet.github.io/issues?state=closed&sort=updated&direction=desc')
      .then(function(issues) {
        return issues;
      }, function(err) {
        console.log('unable to fetch list of closed issues from github: ' + err);
        return [];
      });
  }
});

App.ServicesController = Ember.Controller.extend({
  query: '',
  isActiveFilter: 1,
  services: [],
  performSearch: function() {
    var services = this.get('services');
    var isActiveFilter = this.get('isActiveFilter') === 1 ? true : (this.get('isActiveFilter') === 2 ? false : null);
    var query = this.get('query');
    var country = this.get('session.hasNetworkAdminRole') || this.get('session.hasManagerRole') ?
      '' : this.get('session.userCountry');
    if (query && query.length > 3) {
      Ember.$.getJSON('http://localhost:8090/services?q=' + query + '&country=' + country + "&isActive=" + isActiveFilter)
        .then(function(data) {
          services.setObjects(data.services);
        });
    }
    else {
      services.setObjects([]);
    }
  },
  search: function() {
    Ember.run.debounce(this, this.performSearch, 100);
  }.observes('query', 'isActiveFilter'),
  actions: {
    editService: function(service) {
      this.transitionToRoute('/services/' + service.service_id);
    }
  }
});

App.ServicePrintController = Ember.Controller.extend({
  agreementNo: Ember.computed(function() {
    return servcieIdToAgreement(this.get('model.service.id'));
  }),
  serviceName: Ember.computed('model.service', function() {
    return serviceName(this.get('model.service'));
  }),
  customerAddress: Ember.computed('model.customer', function() {
    var address = customerAddress(this.get('model.customer'));
    return address === '' ? '' : _join(', ', address, countryIdToName(this.get('model.customer.country')));
  }),
  connectionLocation: Ember.computed('model.service', function() {
    return serviceAddress(this.get('model.service.address'));
  }),
  isPlService: Ember.computed('model.service.id', function() {
    return  serviceIdToCountry(this.get('model.service.id')) === "PL";
  }),
  devices: Ember.computed('model.service.data.devices', function() {
    var devices = this.get('model.service.data.devices').map(function(device, idx) {
      return {
        name: device.name,
        isOwnedBySilesnet: device.owner === 'silesnet',
        isOwnedByCustomer: device.owner !== 'silesnet'
      };
    });
    return devices;
  }),
  hasDhcp: Ember.computed('model.service', 'model.dhcp', 'model.dhcp_wireless', function() {
    var country = serviceIdToCountry(this.get('model.service.id')),
      name = this.get('model.service.name').toLowerCase();
    if (country === 'PL') {
      return name.substring(0, 8) === 'wireless';
    } else {
      return (this.get('model.dhcp.port') ||
               this.get('model.dhcp_wireless.service_id')) ? true : false;
    }
  }),
  hasPppoe: Ember.computed('model.service', 'model.pppoe', function() {
    var country = serviceIdToCountry(this.get('model.service.id')),
      name = this.get('model.service.name').toLowerCase();
    if (country === 'PL') {
      return name.substring(0, 3) === 'lan';
    } else {
      return this.get('model.pppoe.service_id') ? true : false;
    }
  }),
  hasAccessDetails: Ember.computed('hasDhcp', 'hasPppoe', function() {
    return this.get('hasDhcp') || this.get('hasPppoe');
  })
});

App.ServiceIndexController = Ember.Controller.extend({
  access: Ember.computed('model.service.name', 'model.pppoe.mode', 'hasDhcp', 'hasPppoe', function () {
    var
      channel = serviceChannel(this.get('model.service.name'), this.get('model.pppoe.mode')),
      protocol = serviceProtocol(this.get('hasDhcp'), this.get('hasPppoe'), this.get('model.service.name'));
    return {
      channel: channel,
      protocol: protocol
    };
  }),
  eventsSortOder: ['id:desc'],
  eventsSorted: Ember.computed.sort('model.events', 'eventsSortOder'),
  isPppoeStaticIp: Ember.computed('model.pppoe.ip_class', function() {
    return this.get('model.pppoe.ip_class') === 'static';
  }),
  isDhcpWirelessStaticIp: Ember.computed('model.dhcp_wireless.ip_class', function() {
    return this.get('model.dhcp_wireless.ip_class') === 'static';
  }),
  statusMap: {
    INHERIT_FROM_CUSTOMER: 'Podle zákazníka',
    ACTIVE: 'Aktivní',
    SUSPENDED: 'Pozastaveno',
    DEBTOR: 'Dlužník',
  },
  serviceStatus: Ember.computed('model.service.actual_status', function() {
    return this.get('statusMap')[this.get('model.service.actual_status')];
  }),
  serviceCountry: Ember.computed('model.service.id', function() {
    return serviceIdToCountry(this.get('model.service.id'));
  }),
  serviceCurrency: Ember.computed('model.service.id', function() {
    return serviceIdToCurrency(this.get('model.service.id'));
  }),
  isDraft: Ember.computed('model.service.is_draft', function() {
    return this.get('model.service.is_draft');
  }),
  hasCustomer: Ember.computed('model.customer.name', function() {
    return this.get('model.customer.name') ? true : false;
  }),
  hasCustomerDraft: Ember.computed('model.customer_draft.data', function() {
    return this.get('model.customer_draft.data') ? true : false;
  }),
  customerName: Ember.computed('hasCustomerDraft', function() {
    return this.get('hasCustomerDraft') ?
      customerDraftName(this.get('model.customer_draft.data')) :
      this.get('model.customer.name');
  }),
  customerAddress: Ember.computed('hasCustomerDraft', function() {
    return this.get('hasCustomerDraft') ?
      draftAddress(this.get('model.customer_draft.data')) :
      customerAddress(this.get('model.customer'));
  }),
  customerEmail: Ember.computed('hasCustomerDraft', function() {
    return this.get('hasCustomerDraft') ?
      this.get('model.customer_draft.data.email') :
      this.get('model.customer.email');
  }),
  customerPhone: Ember.computed('hasCustomerDraft', function() {
    return this.get('hasCustomerDraft') ?
      this.get('model.customer_draft.data.phone') :
      this.get('model.customer.phone');
  }),
  hasDhcp: Ember.computed('model.dhcp.port', function() {
    return this.get('model.dhcp.port') ? true : false;
  }),
  hasDhcpWireless: Ember.computed('model.dhcp_wireless.service_id', function() {
    return this.get('model.dhcp_wireless.service_id') ? true : false;
  }),
  hasPppoe: Ember.computed('model.pppoe.service_id', function() {
    return this.get('model.pppoe.service_id') ? true : false;
  }),
  canEdit: Ember.computed('isDraft', function() {
    return !this.get('isDraft');
  }),
  canEditDhcp: Ember.computed('canEdit', 'hasDhcp', function() {
    return this.get('canEdit') && this.get('hasDhcp');
  }),
  canEditDhcpWireless: Ember.computed('canEdit', 'hasDhcpWireless', function() {
    return this.get('canEdit') && this.get('hasDhcpWireless');
  }),
  canEditPppoe: Ember.computed('canEdit', 'hasPppoe', function() {
    return this.get('canEdit') && this.get('hasPppoe');
  }),
  canAddDhcp: Ember.computed('canEdit', 'hasDhcp', 'access', function() {
    return this.get('canEdit') && !this.get('hasDhcp') &&
      this.get('access.channel') === 'lan';
  }),
  canAddDhcpWireless: Ember.computed('canEdit', 'hasDhcpWireless', 'access', function() {
    return this.get('canEdit') && !this.get('hasDhcpWireless') &&
      this.get('access.channel') === 'wireless';
  }),
  canAddPppoe: Ember.computed('canEdit', 'hasPppoe', function() {
    return this.get('canEdit') && !this.get('hasPppoe');
  }),
  isPlService: Ember.computed('serviceCountry', function() {
    return this.get('serviceCountry') === 'PL';
  }),
  servicePeriod: Ember.computed('model.service.period_from', function () {
    var from = this.get('model.service.period_from'),
      to = this.get('model.service.period_to'),
      period = { from: '...', to: '...' };
    if (from) {
      period.from = from.substr(0, 10);
    }
    if (to) {
      period.to = to.substr(0, 10);
    }
    return period;
  }),
  isPlService: Ember.computed('model.service.id', function() {
    return  serviceIdToCountry(this.get('model.service.id')) === "PL";
  }),
  isDhcpWirelessConnected: Ember.computed('model.dhcpWirelessConnection.status', function() {
    return this.get('model.dhcpWirelessConnection.status') === 'bound';
  }),
  actions: {
    openTabs: function(url1, url2) {
      window.open(url1);
      window.open(url2);
    },
    addPppoe(model) {
      var newPppoe = {
        login: model.service.id,
        password: generatePassword(8),
        ip_class: serviceIdToCountry(model.service.id) === 'CZ' ? 'internal-cz' : 'public-pl',
        mode: serviceToPppoeMode(model.service.id, model.service.name),
        ip: { type: 'inet', value: null },
        mac: { type: 'macaddr', value: null },
        _isNew: true
      };
      this.set('model.pppoe', newPppoe);
      this.send('openModal', 'formEditPppoe', model);
    },
    addDhcpWireless(model) {
      var newDhcpWireless = {
        ip_class: serviceIdToCountry(model.service.id) === 'CZ' ? 'internal-cz' : 'public-pl',
        ip: { type: 'inet', value: null },
        mac: { type: 'macaddr', value: null },
        _isNew: true
      };
      this.set('model.dhcp_wireless', newDhcpWireless);
      this.send('openModal', 'formEditDhcpWireless', model);
    }
  }
});

App.ConfirmDhcpRemovalController = Ember.Controller.extend({
  actions: {
    removeDhcp: function(service) {
      var self = this;
      console.log('removing dhcp for ' + this.model.service.id);
      putJSON(
        'http://localhost:8090/networks/dhcp/' + this.model.service.id,
        { services: { dhcp: {} } })
      .then(function(data) {
        self.send('reload');
        self.get('flashes').success('OK', 1000);
      }, function(err) {
        self.get('flashes').danger(err.detail, 5000);
      });
    }
  }
});

App.ConfirmDhcpWirelessRemovalController = Ember.Controller.extend({
  actions: {
    removeDhcpWireless: function(service) {
      var self = this;
      console.log('removing dhcp wireless for ' + this.model.service.id);
      putJSON(
        'http://localhost:8090/networks/dhcp-wireless/' + this.model.service.id,
        { services: { dhcp_wireless: {} } })
      .then(function(data) {
        self.send('reload');
        self.get('flashes').success('OK', 1000);
      }, function(err) {
        self.get('flashes').danger(err.detail, 5000);
      });
    }
  }
});

App.ConfirmPppoeRemovalController = Ember.Controller.extend({
  actions: {
    removePppoe: function(service) {
      var self = this;
      console.log('removing pppoe for ' + this.model.service.id);
      putJSON(
        'http://localhost:8090/networks/pppoe/' + this.model.service.id,
        { services: { pppoe: {} } })
      .then(function(data) {
        self.send('reload');
        self.get('flashes').success('OK', 1000);
        return putJSON('http://localhost:8090/networks/pppoe/' +
          self.model.pppoe.login + '/kick/' + self.model.pppoe.master, {});
      })
      .then(function() {
        self.get('flashes').success(
          "'" + self.model.pppoe.master + "' kicked '" + self.model.pppoe.login + "'", 3000);
      })
      .catch(function(err) {
        self.get('flashes').danger(err.detail, 5000);
      });
    }
  }
});

App.FormEditServiceController = Ember.Controller.extend({
  statuses: [
    { name: 'Podle zákazníka', value: 'INHERIT_FROM_CUSTOMER'},
    { name: 'Aktivní', value: 'ACTIVE' },
    { name: 'Pozastaveno', value: 'SUSPENDED' },
    { name: 'Dlužník', value: 'DEBTOR' }
  ],
  actions: {
    addressSelected(address) {
      var isAddressPlace = this.get('model.form.service.address_place') === this.get('model.form.service.place');
      if (address) {
        this.set('model.form.service.address_id', address.address_id);
        this.set('model.form.service.address_fk', address.address_fk);
        this.set('model.form.service.address_label', address.label);
        this.set('model.form.service.address_place_id', address.place_id);
        this.set('model.form.service.address_place', (address.gps_cord || ''));
        if (isAddressPlace) {
          this.set('model.form.service.place', (address.gps_cord || ''));
          this.set('model.form.service.place_id', address.place_id);
        }
      }
      else {
        if (!isAddressPlace) {
          this.set('model.form.service.address_id', null);
          this.set('model.form.service.address_fk', null);
          this.set('model.form.service.address_label', null);
          this.set('model.form.service.address_place_id', null);
          this.set('model.form.service.address_place', null);
        }
      }
    },
    placeSelected(place) {
      if (place) {
        this.set('model.form.service.place', (place || ''));
        this.set('model.form.service.place_id', null);
      }
      else {
        this.set('model.form.service.place', this.get('model.form.service.address_place'));
        this.set('model.form.service.place_id', this.get('model.form.service.address_place_id'));
      }
    },
    submit: function() {
      var self = this,
      currentService = this.model.service,
      updatedService = this.model.form.service,
      pppoeLogin = this.model.pppoe.login,
      pppoeMaster = this.model.pppoe.master,
      serviceUpdate = {};
      if (currentService.info !== updatedService.info ||
          currentService.status !== updatedService.status ||
          currentService.address_id !== updatedService.address_id ||
          currentService.place !== updatedService.place ||
          JSON.stringify(currentService.data) !== JSON.stringify(updatedService.data)) {
        serviceUpdate.info = updatedService.info;
        serviceUpdate.status = updatedService.status;
        serviceUpdate.address_id = updatedService.address_id;
        serviceUpdate.address_place = updatedService.address_place;
        serviceUpdate.address_place_id = updatedService.address_place_id;
        serviceUpdate.place = updatedService.place;
        if (!serviceUpdate.place) {
          serviceUpdate.place = serviceUpdate.address_place;
        }
        serviceUpdate.data = JSON.stringify(updatedService.data);
        console.log('updating service '+ this.model.service.id + ': ' + JSON.stringify(serviceUpdate, null, 2));
        putJSON(
          'http://localhost:8090/services/' + this.model.service.id,
          { services: serviceUpdate })
        .then(function(data) {
          self.get('target').send('reload');
          self.get('flashes').success('OK', 1000);
          if (currentService.status !== updatedService.status && pppoeLogin && pppoeMaster) {
            putJSON('http://localhost:8090/networks/pppoe/' + pppoeLogin+ '/kick/' + pppoeMaster, {})
              .then(function() {
                self.get('flashes').success(
                  "'" + pppoeMaster + "' kicked '" + pppoeLogin + "'", 3000); });
          }
        }, function(err) {
          console.log(JSON.stringify(err));
          self.get('flashes').danger(err.detail, 5000);
        });
      }
    },
    addDevice: function() {
      this.get('model.form.service.data.devices').pushObject({ name: '', owner:'silesnet' });
    },
    removeDevice: function(device) {
      this.get('model.form.service.data.devices').removeObject(device);
    }

  }
});

App.FormEditDhcpController = Ember.Controller.extend({
  switches: [],
  defaultOptions: function() {
    if (this.get('switches').length > 0 && !this.get('model.form.dhcp.network_id')) {
      this.set('model.form.dhcp.network_id', this.get('switches')[0].id);
    }
  }.observes('model.form'),
  init: function() {
    var self = this,
    country = this.get('session.userCountry').toLowerCase();
    this._super(...arguments);
    Ember.$.getJSON('http://localhost:8090/networks/' + country + '/devices?deviceType=switch')
         .then(function(switches) {
           self.set('switches', switches.devices);
           self.defaultOptions();
         });
  },
  actions: {
    submit: function() {
      var self = this,
      currentDhcp = this.model.dhcp,
      newDhcp = this.model.form.dhcp,
      updateDhcp = {};
      if (currentDhcp.network_id !== newDhcp.network_id ||
          currentDhcp.ip !== newDhcp.ip ||
          currentDhcp.port !== newDhcp.port) {
        updateDhcp.network_id = newDhcp.network_id;
        updateDhcp.ip = newDhcp.ip;
        updateDhcp.port = newDhcp.port;
        console.log('updating DHCP of '+ this.model.service.id + ': ' + JSON.stringify(updateDhcp, null, 2));
        putJSON(
          'http://localhost:8090/networks/dhcp/' + this.model.service.id,
          { services: { dhcp: updateDhcp } })
        .then(function(data) {
          self.get('target').send('reload');
          self.get('flashes').success('OK', 1000);
        }, function(err) {
          console.log(JSON.stringify(err));
          self.get('flashes').danger(err.detail, 5000);
        });
      }
    }
  }
});

App.FormEditDhcpWirelessController = Ember.Controller.extend({
  ipClasses: Ember.computed('model.service.id', function() {
    var classes = ['static'],
      country = serviceIdToCountry(this.get('model.service.id'));
    if (country === 'CZ') {
      classes.push('internal-cz');      
    } else {
      classes.push('public-pl');
    }
    return classes;
  }),
  routers: [],
  ssids: [],
  ssid: null,
  ssidChanged: function() {
    var ssid = this.get('ssid');
    this.set('model.form.dhcp_wireless.master', ssid.master);
    this.set('model.form.dhcp_wireless.interface', ssid.name);
  }.observes('ssid'),
  interfaceChanged: function() {
    var ssids = this.get('ssids'),
      iface = this.get('model.form.dhcp_wireless.interface'),
      ssid = Ember.A(ssids).findBy('name', iface);
    if (ssid) {
      this.set('ssid', ssid);
    }
  }.observes('model.form.dhcp_wireless.interface'),
  defaultOptions: function() {
    if (this.get('ssids').length > 0 && !this.get('model.form.dhcp_wireless.interface')) {
      this.set('ssid', this.get('ssids')[0]);
      this.ssidChanged();
    }
  }.observes('model.form'),
  init: function() {
    var self = this,
      country = this.get('session.userCountry').toLowerCase();
    this._super(...arguments);
    Ember.$.getJSON('http://localhost:8090/networks/routers')
      .then(function(routers) {
       self.set('routers', routers.core_routers); 
       self.defaultOptions();
     });
    Ember.$.getJSON('http://localhost:8090/networks/ssids')
      .then(function(response) {
        var ssids = response.ssids;
        self.set('ssids', ssids);
        self.interfaceChanged();
        self.defaultOptions();
      });
  },
  isStaticIp: Ember.computed('model.form.dhcp_wireless.ip_class', function() {
    var isStatic = this.get('model.form.dhcp_wireless.ip_class') === 'static',
      ipValue = isStatic ? this.get('model.dhcp_wireless.ip.value') : null;
    this.set('model.form.dhcp_wireless.ip', { type: 'inet', value: ipValue });
    return isStatic;
  }),
  isNotStaticIp: Ember.computed.not('isStaticIp'),
  actions: {
    submit: function() {
      var self = this,
      currentDhcpWireless = this.model.dhcp_wireless,
      newDhcpWireless = this.model.form.dhcp_wireless,
      updateDhcpWireless = {};
      if (newDhcpWireless._isNew ||
          currentDhcpWireless.master !== newDhcpWireless.master ||
          currentDhcpWireless.interface !== newDhcpWireless.interface ||
          currentDhcpWireless.ip_class !== newDhcpWireless.ip_class ||
          currentDhcpWireless.ip.value !== newDhcpWireless.ip.value ||
          currentDhcpWireless.location !== newDhcpWireless.location ||
          // need to fix it for new forms...
          currentDhcpWireless.mac.value !== newDhcpWireless.mac.value) {
        updateDhcpWireless.master = newDhcpWireless.master;
        updateDhcpWireless.interface = newDhcpWireless.interface;
        updateDhcpWireless.location = newDhcpWireless.location;
        updateDhcpWireless.ip_class = newDhcpWireless.ip_class;
        updateDhcpWireless.ip = newDhcpWireless.ip;
        updateDhcpWireless.mac = newDhcpWireless.mac;
        console.log((newDhcpWireless._isNew ? 'adding' : 'updating') + 
          ' DHCP Wireless of '+ this.model.service.id + ': ' + JSON.stringify(updateDhcpWireless, null, 2));
        putJSON('http://localhost:8090/networks/dhcp-wireless/' + this.model.service.id,
          { services: { dhcp_wireless: updateDhcpWireless } })
        .then(function(data) {
          self.get('target').send('reload');
          self.set('model.dhcp_wireless._isNew', false);
          self.get('flashes').success('OK', 1000);
          return true;
        })
        .catch(function(err) {
          self.get('flashes').danger(err.detail, 5000); });
      }
    }
  }
});

App.FormEditPppoeController = Ember.Controller.extend({
  ipClasses: Ember.computed('model.service.id', function() {
    var classes = ['static'],
      country = serviceIdToCountry(this.get('model.service.id'));
    if (country === 'CZ') {
      classes.push('internal-cz');      
    } else {
      classes.push('public-pl');
    }
    return classes;
  }),
  routers: [],
  ssids: [],
  ssid: null,
  ssidChanged: function() {
    var ssid = this.get('ssid');
    this.set('model.form.pppoe.master', ssid.master);
    this.set('model.form.pppoe.interface', ssid.name);
  }.observes('ssid'),
  interfaceChanged: function() {
    var ssids = this.get('ssids'),
      iface = this.get('model.form.pppoe.interface'),
      ssid = Ember.A(ssids).findBy('name', iface);
    if (ssid) {
      this.set('ssid', ssid);
    }
  }.observes('model.form.pppoe.interface'),
  defaultOptions: function() {
    if (this.get('isWireless')) {
      if (this.get('ssids').length > 0 && !this.get('model.form.pppoe.interface')) {
        this.set('ssid', this.get('ssids')[0]);
        this.ssidChanged();
      }
    } else {
      if (this.get('routers').length > 0 && !this.get('model.form.pppoe.master')) {
        this.set('model.form.pppoe.master', this.get('routers')[0].name);
      }
    }
  }.observes('model.form'),
  init: function() {
    this._super(...arguments);
    var self = this,
      country = this.get('session.userCountry').toLowerCase();
    Ember.$.getJSON('http://localhost:8090/networks/routers')
      .then(function(routers) {
        self.set('routers', routers.core_routers);
        self.defaultOptions();
      });
    Ember.$.getJSON('http://localhost:8090/networks/ssids')
      .then(function(response) {
        var ssids = response.ssids;
        self.set('ssids', ssids);
        self.interfaceChanged();
        self.defaultOptions();
      });
  },
  isWireless: Ember.computed('model.service.channel', 'model.service.name', function() {
    var channel = this.get('model.service.channel') || '',
      name = this.get('model.service.name') || '';
    return channel ? channel === 'wireless' : name.substring(0, 8).toLowerCase() === 'wireless';
  }),
  isStaticIp: Ember.computed('model.form.pppoe.ip_class', function() {
    var isStatic = this.get('model.form.pppoe.ip_class') === 'static',
      ipValue = isStatic ? this.get('model.pppoe.ip.value') : null;
    this.set('model.form.pppoe.ip', { type: 'inet', value: ipValue });
    return isStatic;
  }),
  isNotStaticIp: Ember.computed.not('isStaticIp'),
  actions: {
    submit: function() {
      var self = this,
      currentPppoe = this.model.pppoe,
      newPppoe = this.model.form.pppoe,
      updatePppoe = {};
      if (newPppoe._isNew ||
          currentPppoe.master !== newPppoe.master ||
          currentPppoe.interface !== newPppoe.interface ||
          currentPppoe.ip_class !== newPppoe.ip_class ||
          currentPppoe.ip.value !== newPppoe.ip.value ||
          currentPppoe.login !== newPppoe.login ||
          currentPppoe.password !== newPppoe.password ||
          currentPppoe.location !== newPppoe.location ||
          // need to fix it for new forms...
          currentPppoe.mac.value !== newPppoe.mac.value) {
        updatePppoe.master = newPppoe.master;
        updatePppoe.interface = newPppoe.interface;
        updatePppoe.location = newPppoe.location;
        updatePppoe.mode = newPppoe.mode;
        updatePppoe.ip_class = newPppoe.ip_class;
        updatePppoe.ip = newPppoe.ip;
        updatePppoe.login = newPppoe.login;
        updatePppoe.password = newPppoe.password;
        updatePppoe.mac = newPppoe.mac;
        console.log((newPppoe._isNew ? 'adding' : 'updating') + 
          ' PPPoE of '+ this.model.service.id + ': ' + JSON.stringify(updatePppoe, null, 2));
        putJSON('http://localhost:8090/networks/pppoe/' + this.model.service.id,
          { services: { pppoe: updatePppoe } })
        .then(function(data) {
          self.get('target').send('reload');
          self.get('flashes').success('OK', 1000);
          if (!newPppoe._isNew) {
            return putJSON('http://localhost:8090/networks/pppoe/' +
              currentPppoe.login + '/kick/' + currentPppoe.master, {});
          } else {
            return true;
        }})
        .then(function() {
          if (!newPppoe._isNew) {
            self.get('flashes').success(
              "'" + currentPppoe.master + "' kicked '" + currentPppoe.login + "'", 3000);
          self.set('model.pppoe._isNew', false);
        }})
        .catch(function(err) {
          self.get('flashes').danger(err.detail, 5000); });
      }
    }
  }
});

App.FormAddPlTodoController = Ember.Controller.extend({
  category: 'Servis',
  categories: ['Servis', 'Moving', 'Modernization', 'Dismantling', 'Other'],
  priority: 'Normal',
  priorities: ['Low', 'Normal', 'High'],
  assignee: null,
  users: [],
  comment: '',
  init: function() {
    var self = this;
    this._super(...arguments);
    this.set('assignee', this.get('session.user'));
    Ember.$.getJSON('http://localhost:8090/users')
      .then((response) => {
        self.set('users', Ember.A(response.users).filterBy('country', 'PL'));
      });
  },
  initModal: function(model) {
    var comment = '';
    this.set('category', 'Servis');
    this.set('priority', 'Normal');
    comment = [
      servcieIdToAgreement(model.service.id),
      model.customer.name,
      model.service.name + ' ' +
        model.service.download + '/' + model.service.upload + ' Mbs'
    ].join(", ");
    comment += "\n";
    if (model.customer.phone) {
      comment += model.customer.phone + "\n";
    }
    if (model.pppoe.interface) {
      comment += model.pppoe.interface + "\n";
    }
    this.set('comment', comment);
  },
  actions: {
    submit: function() {
      var self = this;
      $.get('https://sis.silesnet.net/sisng/resource/systech/php/todo.php', {
        task: 'ADDTODOFROMPPPOE',
        category: this.get('category'),
        priority: this.get('priority'),
        customerId: this.get('model.customer.id'),
        assignee: this.get('assignee'),
        createdBy: this.get('session.userName'),
        todotask: this.get('comment')
      })
        .done(function() {
          self.get('flashes').success('OK', 1000);
        })
        .fail(function() {
          self.get('flashes').danger('FAIL', 2000);
        });
    }
  }
});

App.FormAddCzTodoController = Ember.Controller.extend({
  reportedAt: '',
  contact: '',
  description: '',
  comment: '',
  reportedBy: null,
  users: Ember.A([{ id: null, name: '<jméno>' }, { id: 5, name: 'David' }, { id: 11, name: 'Ela' }, { id: 9, name: 'Grazyna' }, { id: 16, name: 'Iwona' }, { id: 2, name: 'Kamil' }, { id: 3, name: 'Marcel' }, { id: 19, name: 'Marek' }, { id: 13, name: 'Michal' }, { id: 1, name: 'Mirek' }, { id: 15, name: 'Monika' }, { id: 14, name: 'Pavel' }, { id: 7, name: 'Petr' }, { id: 4, name: 'Radek' }, { id: 18, name: 'Robert' }, { id: 10, name: 'Roman' }]),
  priority: null,
  priorities: Ember.A([{ id: 1, name: 'Nízká' }, { id: 2, name: 'Normal' }, { id: 3, name: 'Vysoká' }]),
  serviceArea: null,
  serviceAreas: Ember.A([
    { id: 1, name: 'F-M (Radek)' }, { id: 2, name: 'OVA, HAV, ORL, ALB (Pavel)' },
    { id: 4, name: 'CTE lan (Mirek)' }, { id: 5, name: 'CTE, KA wire (Michal)' },
    { id: 6, name: 'VEN, BYS, NAV, JAB (David)' }
  ]),
  initModal: function(model) {
    var now = new Date();
    var reportedBy = this.get('users').findBy("name", this.get('session.userName'));
    this.set('reportedAt',
      leftPadNum(now.getDate(), 2) + '.' +
      leftPadNum((now.getMonth() + 1), 2) + '.' +
      now.getFullYear() + ' (' +
      leftPadNum(now.getHours(), 2) + ':' +
      leftPadNum(now.getMinutes(), 2) + ')'
    );
    this.set('contact', [
      model.customer.phone,
      [ model.customer.name, model.service.address_label ].join(", "),
      model.service.id
    ].join(', '));
    this.set('description', '');
    this.set('comment', '');
    this.set('reportedBy', reportedBy ? reportedBy.id : null);
    this.set('priority', 2);
    this.set('serviceArea', 4);
  },
  actions: {
    submit: function() {
      $('#addCzTodoForm').submit();
    }
  }
});

App.FormEditSmsController = Ember.Controller.extend({
  smsMessage: '',
  phoneNumber: '',
  initModal(model) {
    this.set('smsMessage', '');
    this.set('phoneNumber', normalizePhoneNumber(
      Ember.get(model, 'customer.phone'),
      serviceIdToCountry(Ember.get(model, 'service.id'))));
  },
  actions: {
    submit: function() {
      var self = this,
      number = this.get('phoneNumber'),
      text = this.get('smsMessage');
      if (number && text) {
        postJSON(
          'http://localhost:8090/messages/sms',
          { number: number, text: text }
        )
        .then(() => {
          self.get('flashes').success('Odesláno', 1000);
        })
        .catch((err) => {
          self.get('flashes').danger('Chyba při odesílání: ' + err, 2000);
        });
      }
    },
    smsKeysInputFilter: function(value, event) {
      var key = event.key,
        code = key.charCodeAt(0) || event.which || event.keyCode;
      if (code < 32 || code > 126) {
        event.preventDefault();
      }
    }
  }
});

