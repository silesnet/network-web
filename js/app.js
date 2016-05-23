var App = Ember.Application.create({
  currentPath: '',
  rootElement: '#app',
  // LOG_RESOLVER: true
});

Ember.deprecate = () => {};

App.Router.map(function() {
  this.route('services', { path: '/services' }, function() {});
  this.route('service', { path: '/services/:service_id' }, function() {});
  this.route('changelog', { path: '/changelog' }, function() {});
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
    })
  }
});

App.ApplicationRoute = Ember.Route.extend({
  afterModel: function() {
    this.transitionTo('/services');
  },
  actions: {
    openModal: function(name, model) {
      var form = {};
      if (name.substring(0, 4) === 'form') {
        Ember.set(model, 'form', Ember.copy(model, true));
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
    },
    delete: function (model) {
        var self = this;
        var $confirm, el;
        el = this.get('element');
        $confirm = $('.delete-confirm', el);
        $confirm.fadeOut();
        console.log ('delete DHCP for service ' + model.service.id);
        putJSON(
          'http://localhost:8090/services/' + model.service.id,
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

App.ServicesRoute = Ember.Route.extend({
  model: function() {
    return Ember.RSVP.hash({
      query: App.get('query'),
      services: []
    });
  },
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
          pppoe: Ember.$.getJSON('http://localhost:8090/services/' + params.service_id + '/pppoe')
            .then(function(pppoe) { return pppoe.pppoe; })
        });
      });
  },
  setupController: function(controller, model) {
    var login = model.pppoe.login;
    controller.set('model', model);
    Ember.$.getJSON('http://localhost:8090/networks/pppoe/' + login + '/last-ip')
      .then(function(response) { controller.set('lastPppoeIp', response.lastIp.address || null); },
        function(err) { controller.set('lastPppoeIp', null); } );
  },
  events: {
    reload: function() {
      console.log('reloading...');
      this.refresh();
    }
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

App.ApplicationController = Ember.Controller.extend({
  updateCurrentPath: function() {
    App.set('currentPath', this.get('currentPath'));
  }.observes('currentPath')
});

App.ServicesController = Ember.Controller.extend({
  needs: 'application',
  isActiveFilter: 1,
  search: function() {
    var services = this.model.services;
    var isActiveFilter = this.isActiveFilter === 1 ? true : (this.isActiveFilter === 2 ? false : null);
    var query = this.model.query;
    var country = this.get('session.userCountry');
    var currentPath = App.get('currentPath');
    if (currentPath && currentPath != 'services.index') {
      this.transitionToRoute('/services');
    }
    if (query) {
      App.set('query', this.model.query);
      Ember.$.getJSON('http://localhost:8090/services?q=' + query + '&country=' + country + "&isActive=" + isActiveFilter)
        .then(function(data) {
          services.setObjects(data.services);
        });
    }
    else {
      services.setObjects([]);
    }
  }.observes('model.query', 'isActiveFilter'),
  actions: {
    editService: function(service) {
      this.transitionToRoute('/services/' + service.service_id);
    }
  }
});

App.ServiceController = Ember.Controller.extend({
  needs: 'services',
  lastPppoeIp: null,
  isPppoeStaticIp: Ember.computed('model.pppoe.ip_class', function() {
    return this.get('model.pppoe.ip_class') === 'static';
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
  actions: {
    openTabs: function(url1, url2) {
      window.open(url1);
      window.open(url2);
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
      }, function(err) {
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
    submit: function() {
      var self = this,
      currentService = this.model.service,
      updatedService = this.model.form.service,
      serviceUpdate = {};
      if (currentService.info !== updatedService.info ||
          currentService.status !== updatedService.status) {
        serviceUpdate.info = updatedService.info;
        serviceUpdate.status = updatedService.status;
        console.log('updating service '+ this.model.service.id + ': ' + JSON.stringify(serviceUpdate, null, 2));
        putJSON(
          'http://localhost:8090/services/' + this.model.service.id,
          { services: serviceUpdate })
        .then(function(data) {
          self.get('target').send('reload');
          self.get('flashes').success('OK', 1000);
          if (currentService.status !== updatedService.status) {
            // TODO KICK PPPeE if exists!!
          }
        }, function(err) {
          console.log(JSON.stringify(err));
          self.get('flashes').danger(err.detail, 5000);
        });
      }
    }
  }
});


App.FormEditDhcpController = Ember.Controller.extend({
  switches: [],
  init: function() {
    var self = this,
    country = this.get('session.userCountry').toLowerCase();
    this._super();
    Ember.$.getJSON('http://localhost:8090/networks/' + country + '/devices?deviceType=switch')
         .then(function(switches) { self.set('switches', switches.devices); });
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

App.FormEditPppoeController = Ember.Controller.extend({
  ipClasses: [],
  routers: [],
  init: function() {
    var self = this,
      classes = ['static'],
      country = this.get('session.userCountry').toLowerCase();
    this._super();
    Ember.$.getJSON('http://localhost:8090/networks/routers')
         .then(function(routers) { self.set('routers', routers.core_routers); });
    if (country === 'cz') {
      classes.push('internal-cz');
    } else if (country === 'pl') {
      classes.push('public-pl');
    }
    this.set('ipClasses', classes);
  },
  isWireless: Ember.computed('model.service.channel', function() {
    return this.get('model.service.channel') === 'wireless';
  }),
  isStaticIp: Ember.computed('model.form.pppoe.ip_class', function() {
    var isStatic = this.get('model.form.pppoe.ip_class') === 'static',
      ipValue = isStatic ? this.get('model.pppoe.ip.value') : null;
    this.set('model.form.pppoe.ip.value', ipValue);
    return isStatic;
  }),
  isNotStaticIp: Ember.computed.not('isStaticIp'),
  actions: {
    submit: function() {
      var self = this,
      currentPppoe = this.model.pppoe,
      newPppoe = this.model.form.pppoe,
      updatePppoe = {};
      console.log(newPppoe);
      console.log(currentPppoe);
      if (currentPppoe.master !== newPppoe.master ||
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
        updatePppoe.ip_class = newPppoe.ip_class;
        updatePppoe.ip = newPppoe.ip;
        updatePppoe.login = newPppoe.login;
        updatePppoe.password = newPppoe.password;
        updatePppoe.mac = newPppoe.mac;
        console.log('updating PPPoE of '+ this.model.service.id + ': ' + JSON.stringify(updatePppoe, null, 2));
        putJSON('http://localhost:8090/networks/pppoe/' + this.model.service.id,
          { services: { pppoe: updatePppoe } })
        .then(function(data) {
          self.get('target').send('reload');
          self.get('flashes').success('OK', 1000);
          return putJSON('http://localhost:8090/networks/pppoe/'
            + currentPppoe.login + '/kick/' + currentPppoe.master, {}); })
        .then(function() {
          self.get('flashes').success(
            "'" + currentPppoe.master + "' kicked '" + currentPppoe.login + "'", 3000); })
        .catch(function(err) {
          self.get('flashes').danger(err.detail, 5000); });
      }
    }
  }
});
