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
    var regMacAddress = new RegExp("(?:[a-zA-Z0-9]{2}[:-]){5}[a-zA-Z0-9]{2}");
    if(this.value.length > 0 && !regMacAddress.test(this.value)){
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