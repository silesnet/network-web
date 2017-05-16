App.AddressSelectorComponent = Ember.Component.extend({
  addressSelector: null,
  init() {
    this._super();
    console.log('initialized address selector');
  },
  didInsertElement() {
    console.log('inserted AS element...');
    var onAddress = this.get('onAddress');
    var addressSelector = new AddressSelector('addressSelectorInput', {
      maxItems: 25
    })
    .onSearch(function(query, cb) {
      console.log('searching for address: ' + query);
      $.getJSON('http://localhost:8090/addresses?q=' + query)
      .then(function(addresses) {
        cb(null, addresses);
      }, function(err) {
        cb(err);
      });
    })
    .onAddress(function(address) {
      console.log('address selected: ' + address.label);
      onAddress(address);
    });
    this.set('addressSelector', addressSelector);
  },
  willDestroyElement() {
    this.get('addressSelector').destroy();
  }
});

App.GpsCordComponent = Ember.Component.extend({
  init() {
    this._super();
    console.log('initialized GPS cord');
  },
  didInsertElement() {
    console.log('inserted GS element...');
  }

});

//https://gist.github.com/kenkogi/35f518eab57aa544bf1ba5b0e506788b
App.RadioButtonComponent = Ember.Component.extend({
  init() {
    this._super();
    Ember.run.once(this, 'isChecked');
  },

  tagName: 'input',
  type: 'radio',
  attributeBindings: [ 'checked', 'name', 'type', 'value' ],
  checked: null,
  isChecked() {
    if (this.get('value') === this.get('groupValue')) {
      Ember.run.once(this, 'takeAction');
      this.set('checked', true);
    } else {
      this.set('checked', null);
    }
  },
  takeAction() {
    this.sendAction('selectedAction', this.get('value'));
  },
  change() {
    this.set('groupValue', this.get('value'));
    Ember.run.once(this, 'isChecked');
  }
});

App.ModalFormComponent = Ember.Component.extend({
  submitLabel: 'Uložit',
  cancelLabel: 'Storno',
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
    Ember.run.scheduleOnce('afterRender', this, function() {
      $('.autofocus').focus();
    });
  }.on('didInsertElement'),
  keyDown: function(event) {
    if (event.ctrlKey && event.keyCode === 13) {
      this.send('ok');
    }
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

App.IPAddressField = Ember.TextField.extend({
  classNames: "form-control ip-address",
  classNameBindings: ['err'],
  type: 'text',
  placeholder: "0.0.0.0",
  maxlength: "15",
  keyPress: function (e){
    var tmpKeyCode = e.charCode || e.keyCode;
    if((tmpKeyCode > 47 && tmpKeyCode < 58) || tmpKeyCode == 190 || tmpKeyCode == 46|| tmpKeyCode == 8 || tmpKeyCode == 37|| tmpKeyCode == 39){
      return true;
    }
    e.preventDefault();
    return false;
  },
  keyUp: function (){
    var regIpAddress = new RegExp("^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$");
    if(this.value.length > 0 && !regIpAddress.test(this.value)){
      this.set("err", true);
    }else{
      this.set("err", false);
    }
  }
});

App.PortField = Ember.TextField.extend({
  classNames: "form-control port",
  classNameBindings: ['err'],
  type: 'number',
  maxlength: "3",
  keyUp: function (){
    if(this.value > 1 && this.value < 255){
      this.set("err", false);
    }else{
      this.set("err", true);
    }
  }
});

App.MACAddressField = Ember.TextField.extend({
  classNames: "form-control mac-address",
  classNameBindings: ['err'],
  type: 'text',
  placeholder: "AB:CD:EF:01:23:45",
  maxlength: "17",
  keyPress: function (e){
    var tmpKeyCode = e.charCode || e.keyCode;
    if((tmpKeyCode > 47 && tmpKeyCode < 58) || (tmpKeyCode > 96 && tmpKeyCode < 103) || (tmpKeyCode > 64 && tmpKeyCode < 71) || tmpKeyCode == 45|| tmpKeyCode == 58 || tmpKeyCode == 46|| tmpKeyCode == 8 || tmpKeyCode == 37|| tmpKeyCode == 39){
      return true;
    }
    e.preventDefault();
    return false;
  },
  keyUp: function (){
    var regMacAddress = new RegExp("(?:[a-zA-Z0-9]{2}[:-]?){5}[a-zA-Z0-9]{2}");
    if(this.value.length > 0 && (!regMacAddress.test(this.value) || this.value.length > 12)){
      this.set("err", true);
    }else{
      this.set("err", false);
    }
  }
});

App.ActiveButtonComponent = Ember.Component.extend({
  tagName: "input",
  classNames: "icon-isactive",
  type: "button",
  attributeBindings : ["name", "type", "value", "rel"],
  click: function() {
    var val = Number(this.get('value')) + 1;
    if(val > 2){
      val = 0;
    }
    this.set('value', val);
  }
});