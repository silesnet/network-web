$('script[type="text/x-handlebars"]').each(function() {
  var name = $(this).attr('data-template-name'),
  src = $(this).attr('src');
  if (src) {
    // console.log("loading handlebars template '" + name + "' from '" + src + "'");
    $.get(src, function(template) {
      Ember.TEMPLATES[name] = Ember.Handlebars.compile(template);
    });
  }
});