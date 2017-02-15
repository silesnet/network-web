$('script[type="text/plain"]').each(function() {
  var name = $(this).attr('data-template-name'),
  src = $(this).attr('data-src');
  if (src && name) {
    console.log("loading handlebars template '" + name + "' from '" + src + "'");
    $.get(src, function(template) {
      console.log("parsing template...");
      Ember.TEMPLATES[name] = Ember.Handlebars.compile(template);
      console.log("template loaded");
    });
  }
});