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
    return Ember.RSVP.hash({
      user: Ember.$.getJSON('http://localhost:8090/users/current?session=test')
              .then(function(data) { return data.users})
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
    return {
      query: '',
      services: []
    };
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
      console.log('searching...' + query);
      Ember.$.getJSON('http://localhost:8090/services?q=' + query + '&country=' + country)
        .then(function(data) {
          services.setObjects(data.services);
        });
    }
    else {
      services.setObjects([]);
    }
  }.observes('model.query')
});
