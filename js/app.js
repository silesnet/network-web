var App = Ember.Application.create({
  currentPath: '',
  rootElement: '#app',
  // LOG_RESOLVER: true
});

App.Router.map(function() {
  this.route('services', { path: '/services' }, function() {});
  this.route('service', { path: '/services/:service_id' }, function() {});
});

App.ApplicationRoute = Ember.Route.extend({
  model: function() {
    var sessionId = cookie('JSESSIONID') || 'test';
    return Ember.RSVP.hash({
      user: Ember.$.getJSON('http://localhost:8090/users/current?session=' + sessionId)
              .then(function(data) { return data.users; })
    });
  },
  afterModel: function() {
    this.transitionTo('/services');
  },
  actions: {
    openModal: function(name, model) {
      console.log(name + ' ' + model.name);
      this.controllerFor(name).set('model', model);
      return this.render(name, {
        into: 'application',
        outlet: 'modal'
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


App.EditDhcpController = Ember.Controller.extend({
  actions: {
    close: function() {
      return this.send('closeModal');
    }
  }  
});

App.ModalDialogComponent = Ember.Component.extend({
  actions: {
    close: function() {
      return this.sendAction();
    }
  }  
});


function cookie(name) {
  var value = '; ' + document.cookie;
  var parts = value.split('; ' + name + '=');
  if (parts.length == 2) return parts.pop().split(";").shift();
}