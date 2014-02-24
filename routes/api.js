(function() {
  var async, fs, markup, storejs, wiki;

  fs = require('fs');

  async = require('async');

  markup = require('markup');

  wiki = require('wiki');

  storejs = require('revisionary');

  module.exports = function(app) {
    var me;
    return me = {
      index: function(req, res, next) {
        var store;
        store = app.get('store');
        return store.list('/', function(err, resources) {
          if (err != null) {
            return next(err);
          }
          return res.send(resources);
        });
      },
      all: function(req, res, next) {
        var store;
        store = app.get('store');
        return store.all('/', function(err, resources) {
          if (err != null) {
            return next(err);
          }
          return res.send(resources);
        });
      },
      go: function(req, res, next) {
        var action, term;
        action = req.param('action');
        term = req.param('search');
        switch (action) {
          case 'go':
            return res.redirect(wiki.url(term, 'view'));
          case 'search':
            return me.search(req, res, next);
        }
      },
      search: function(req, res, next) {
        var store, term;
        term = req.param('search');
        store = app.get('store');
        return store.search(term, {}, function(err, matches) {
          if (err) {
            return next(err);
          }
          return res.send(matches);
        });
      },
      preview: function(req, res, next) {
        var format, text;
        text = req.param('text');
        format = req.param('format');
        return markup.html(text, {
          from: format
        }, function(err, html) {
          if (err != null) {
            return next(err);
          }
          return res.send(html);
        });
      },
      recent: function(req, res, next) {
        var store;
        store = app.get('store');
        return store.log('', function(err, revisions) {
          if (err) {
            return next(err);
          }
          return res.send(revisions);
        });
      },
      upload: function(req, res, next) {
        var author, file, message, store, _ref, _ref1;
        if (((_ref = req.files) != null ? (_ref1 = _ref.upload) != null ? _ref1.path : void 0 : void 0) != null) {
          file = req.files.upload;
          store = app.get('store');
          author = new storejs.Author(req.user.name, req.user.email);
          message = "Uploaded file: " + file.name;
          return fs.readFile(file.path, function(err, data) {
            if (err) {
              return res.send({
                error: 'Could not read uploaded file.'
              });
            }
            return store.create(file.name, data, author, message, function(err, resource) {
              return res.send({
                error: err,
                filename: resource != null ? resource.path : void 0
              });
            });
          });
        } else {
          return res.send({
            error: 'No upload found.'
          });
        }
      }
    };
  };

}).call(this);
