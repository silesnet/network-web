$('script[type="text/x-handlebars-lazy"]').each(function() {
  var name = $(this).attr('data-template-name'),
    src = $(this).attr('data-src');
  if (src && name) {
    try {
      $.get(src, function(template) {
        Ember.TEMPLATES[name] = Ember.Handlebars.compile(template);
      });
    } catch(err) {
      console.log("unable to load handlebars template lazily '" + name + "': " + err);    
    }
  }
});