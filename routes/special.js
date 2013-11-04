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
      all: function(req, res, next) {
        var store;
        store = app.get('store');
        return store.list('/', function(err, resources) {
          if (err != null) {
            return next(err);
          }
          return res.render('pages/list.jade', {
            resources: resources,
            title: 'All Pages',
            parents: []
          });
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
          return res.render('search.jade', {
            term: term,
            matches: matches,
            wiki: wiki
          });
        });
      },
      recent: function(req, res, next) {
        var store;
        store = app.get('store');
        return store.log('', function(err, revisions) {
          if (err) {
            return next(err);
          }
          return res.render('recent.jade', {
            revisions: revisions,
            wiki: wiki
          });
        });
      },
      uploader: function(req, res, next) {
        return res.render('upload.jade');
      },
      upload: function(req, res, next) {
        var author, file, message, store, _ref, _ref1;
        if (((_ref = req.files) != null ? (_ref1 = _ref.upload) != null ? _ref1.path : void 0 : void 0) != null) {
          file = req.files.upload;
          store = app.get('store');
          author = new storejs.Author('Name', 'example@example.com');
          message = "Uploaded file: " + file.name;
          return fs.readFile(file.path, function(err, data) {
            if (err) {
              return next(err);
            }
            return store.create(file.name, data, author, message, function(err, resource) {
              if (err) {
                return next(err);
              }
              return res.send('ok');
            });
          });
        } else {
          console.log(req.files);
          return next(new Error());
        }
      }
    };
  };

}).call(this);
