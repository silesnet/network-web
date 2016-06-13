App.Session = Ember.Service.extend({
  userName: null,
  userCountry: null,
  userRoles: null,
  hasNetworkAdminRole: Ember.computed('userRoles', function() {
    return this.get('userRoles').indexOf('ROLE_NETWORK_ADMIN') > -1;
  }),
  hasManagerRole: Ember.computed('userRoles', function() {
    return this.get('userRoles').indexOf('ROLE_TECH_ADMIN') > -1;
  }),
  configure: function(user) {
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
