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
      .then(function(data) { return data; });
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

function cookie(name) {
  var value = '; ' + document.cookie;
  var parts = value.split('; ' + name + '=');
  if (parts.length == 2) return parts.pop().split(";").shift();
}