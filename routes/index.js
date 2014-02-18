(function() {
  var wiki;

  wiki = require('wiki');

  module.exports = function(app) {
    return {
      index: function(req, res) {
        console.log('redirecting from / to /pages/main/view');
        return res.redirect(wiki.mainPage());
      },
      page: require('./page')(app),
      special: require('./special')(app),
      categories: require('./categories')(app),
      api: require('./api')(app)
    };
  };

}).call(this);
