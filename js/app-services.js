App.Status = Ember.Service.extend({
  fullVersion: '15.6.17-854+cdced69',
  version: Ember.computed('fullVersion', function() {
    return applicationVersion('network-web', this.get('fullVersion'));
  }),
  serviceFullVersion: '14.4.1-326+388872d',
  serviceVersion: Ember.computed('serviceFullVersion', function() {
    return applicationVersion('crm-service', this.get('serviceFullVersion'));
  })
});

App.Session = Ember.Service.extend({
  userId: null,
  user: null,
  userName: null,
  userCountry: null,
  userRoles: null,
  hasNetworkAdminRole: Ember.computed('userRoles', function() {
    return this.get('userRoles').indexOf('ROLE_NETWORK_ADMIN') > -1;
  }),
  hasManagerRole: Ember.computed('userRoles', function() {
    return this.get('userRoles').indexOf('ROLE_TECH_ADMIN') > -1;
  }),
  hasManagerOrNetworkAdminRole: Ember.computed('userRoles', function() {
    return (this.get('userRoles').indexOf('ROLE_TECH_ADMIN') > -1) ||
      (this.get('userRoles').indexOf('ROLE_NETWORK_ADMIN') > -1);
  }),
  configure: function(user) {
    this.set('userId', user.id);
    this.set('user', user.user);
    this.set('userName', user.name);
    this.set('userCountry', user.operation_country);
    this.set('userRoles', user.roles);
  }
});

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
