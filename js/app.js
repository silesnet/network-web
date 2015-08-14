var App = Ember.Application.create({
  currentPath: '',
  rootElement: '#app',
  // LOG_RESOLVER: true
});

App.Router.map(function() {
  this.route('services', { path: '/services' }, function() {});
  this.route('service', { path: '/services/:service_id' }, function() {});
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
    }
  }
});

App.ServicesRoute = Ember.Route.extend({
  setupController: function(controller, model) {
    var user = this.modelFor('application').user;
    model.user = user;
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

App.ApplicationController = Ember.Controller.extend({
  updateCurrentPath: function() {
    App.set('currentPath', this.get('currentPath'));
  }.observes('currentPath')
});

App.ServicesController = Ember.Controller.extend({
  needs: 'application',
  search: function() {
    var services = this.model.services;
    var query = this.model.query;
    var country = this.model.user.operation_country;
    var currentPath = App.get('currentPath');
    if (currentPath && currentPath != 'services.index') {
      this.transitionToRoute('/services');
    }
    if (query) {
      App.set('query', this.model.query);
      console.log('searching...' + query);
      Ember.$.getJSON('http://localhost:8090/services?q=' + query + '&country=' + country)
        .then(function(data) {
          services.setObjects(data.services);
        });
    }
    else {
      services.setObjects([]);
    }
  }.observes('model.query'),
  actions: {
    editService: function(service) {
      console.log('editing service... ' + this.model.query);
      this.transitionToRoute('/services/' + service.service_id);
    }
  }
});

App.ServiceController = Ember.Controller.extend({
  needs: 'services'
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
          currentDhcp.port !== newDhcp.port) {
        updateDhcp.network_id = newDhcp.network_id;
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

App.ModalFormComponent = Ember.Component.extend({
  actions: {
    ok: function() {
      this.$('.modal').modal('hide');
      this.sendAction('ok');
    }
  },
  show: function() {
    this.$('.modal').modal().on('hidden.bs.modal', function() {
      this.sendAction('close');
    }.bind(this));
  }.on('didInsertElement')
});

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

App.FlashMessagesService = Ember.Service.extend({
  queue: Ember.A([]),
  isEmpty: Ember.computed.equal('queue.length', 0),
  defaultTimeout: 2000,
  isStack: true,
  success: function(message, timeout) {
    this._add(message, 'success', timeout);
  },
  danger: function(message, timeout) {
    this._add(message, 'danger', timeout);
  },
  _add: function(message, type, timeout) {
    var flash;
    timeout = (timeout === undefined) ? this.get('defaultTimeout') : timeout;
    flash = this._newFlash(message, type, timeout);
    if (this.get('isStack')) {
      this.get('queue').insertAt(0, flash);
    } else {
      this.get('queue').pushObject(flash);
    }
    return flash;
  },
  _newFlash: function(message, type, timeout) {
    var self = this;
    return Ember.Object.create({
      type: type,
      message: message,
      timer: null,
      init: function() {
        this.set('timer', Ember.run.later(this, 'destroyMessage', timeout));
      },
      destroyMessage: function() {
        self.get('queue').removeObject(this);
        this.destroy();
      },
      willDestroy: function() {
        var timer = this.get('timer');
        if (timer) {
          Ember.run.cancel(timer);
          this.set('timer', null);
        }
      }
    });
  }
});

App.FlashMessageComponent = Ember.Component.extend({
  classNames: ['alert', 'flashMessage'],
  classNameBindings: ['alertType'],
  alertType: Ember.computed('flash.type', function() {
    var flashType = this.get('flash.type');
    return 'alert-' + flashType;
  }),
  click: function() {
    this.get('flash').destroyMessage();
  }
});

function cookie(name) {
  var value = '; ' + document.cookie;
  var parts = value.split('; ' + name + '=');
  if (parts.length == 2) return parts.pop().split(";").shift();
}
