var App = Ember.Application.create({
  currentPath: '',
  rootElement: '#app',
  // LOG_RESOLVER: true
});

App.Router.map(function() {
  this.route('services', { path: '/services' }, function() {});
  this.route('service', { path: '/services/:service_id' }, function() {});
  this.route('changelog', { path: '/changelog' }, function() {});
});

Ember.Application.initializer({
  name: 'flash-messages',
  initialize: function(container, application) {
    application.register('service:flash-messages', application.FlashMessagesService, { singleton: true });
    application.inject('controller', 'flashes', 'service:flash-messages');    application.inject('controller', 'flashes', 'service:flash-messages');
    application.inject('route', 'flashes', 'service:flash-messages');
  }
});

App.ApplicationRoute = Ember.Route.extend({
  model: function() {
    var sessionId = cookie('JSESSIONID') || 'test';
    return Ember.RSVP.hash({
      user: Ember.$.getJSON('http://localhost:8090/users/current?session=' + sessionId)
              .then(function(data) {
                App.set('user', data.users);
                return data.users;
              })
    });
  },
  afterModel: function() {
    this.transitionTo('/services');
  },
  actions: {
    openModal: function(name, model) {
      console.log('openModal: ' + name);
      var form = {};
      if (name.substring(0, 4) === 'form') {
        model.form = Ember.copy(model, true);
      }
      return this.render(name, {
        into: 'application',
        outlet: 'modal',
        model: model
      });
    },
    closeModal: function() {
      console.log('closing modal outlet...');
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
  setupController: function(controller, model) {
    var user = this.modelFor('application').user;
    model.user = user;
    model.isActive = true;
    controller.set('model', model);
    this._super(controller, model);
  },
  model: function() {
    return Ember.RSVP.hash({
      query: App.get('query'),
      services: []
    });
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
  search: function() {
    var services = this.model.services;
    var isActive = this.model.isActive;
    var query = this.model.query;
    var country = this.model.user.operation_country;
    var currentPath = App.get('currentPath');
    if (currentPath && currentPath != 'services.index') {
      this.transitionToRoute('/services');
    }
    if (isActive === undefined || isActive === false) {
      isActive = 0;
    } else {
      isActive = 1;
    }
    if (query) {
      App.set('query', this.model.query);
      console.log('searching... ' + query + " activeClients = " + isActive);
      Ember.$.getJSON('http://localhost:8090/services?q=' + query + '&country=' + country + "&isActive=" + isActive)
        .then(function(data) {
          services.setObjects(data.services);
        });
    }
    else {
      services.setObjects([]);
    }
  }.observes('model.query', 'model.isActive'),
  actions: {
    editService: function(service) {
      console.log('editing service... ' + this.model.query);
      this.transitionToRoute('/services/' + service.service_id);
    }
  }
});

App.ServiceController = Ember.Controller.extend({
  needs: 'services',
});

App.ConfirmDhcpRemovalController = Ember.Controller.extend({
  actions: {
    removeDhcp: function(service) {
      var self = this;
      console.log('removing dhcp for ' + this.model.service.id);
      putJSON(
        'http://localhost:8090/services/' + this.model.service.id,
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

App.FormEditDhcpController = Ember.Controller.extend({
  switches: [],
  init: function() {
    var self = this;
    this._super();
    Ember.$.getJSON('http://localhost:8090/networks/' + App.get('user.operation_country').toLowerCase() + '/devices?deviceType=switch')
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
          'http://localhost:8090/services/' + this.model.service.id,
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
