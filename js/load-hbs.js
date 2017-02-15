$('script[type="text/x-handlebars-lazy"]').each(function() {
  var name = $(this).attr('data-template-name'),
    src = $(this).attr('data-src');
  if (src && name) {
    $.get(src, function(template) {
      Ember.TEMPLATES[name] = Ember.Handlebars.compile(template);
    });
  }
});