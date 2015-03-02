(function() {
  var async, fs, markup, pth, storejs, wiki;

  fs = require('fs');

  pth = require('path');

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
            var newPath;
            if (err) {
              return res.send({
                error: 'Could not read uploaded file.'
              });
            }
            newPath = pth.join(req.param('path') || '', file.name);
            return store.create(newPath, data, author, message, function(err, resource) {
              if (err) {
                app.get('log').error(err);
                return res.send(500, {
                  error: err.message,
                  filename: resource != null ? resource.path : void 0
                });
              } else {
                return res.send({
                  filename: resource != null ? resource.path : void 0
                });
              }
            });
          });
        } else {
          return res.send({
            error: 'No upload found.'
          });
        }
      },
      /**
      		 * Route to view a page as HTML
      		 * @param  {Request} req Incoming HTTP request
      		 * @param  {Response} res Outgoing HTTP response
      */

      view: function(req, res, next) {
        var page, store, version;
        store = app.get('store');
        page = wiki.filename(req.sanitize(0).trim());
        version = req.sanitize(1).trim() || null;
        return wiki.retrieve(page, {
          id: version
        }, store, {
          'folder': function(err, contents) {
            return me.list(req, res, next);
          },
          'file': function(err, text) {
            if (err != null) {
              return next(err);
            }
            if (!text) {
              return res.redirect(wiki.url(page, 'edit'));
            }
            return wiki.preprocess(page, text, function(err, text, metadata) {
              if (err != null) {
                return next(err);
              }
              metadata.version = version;
              return res.send({
                text: text,
                metadata: metadata
              });
            });
          },
          'error': function(err) {
            return next(err);
          },
          'default': function() {
            return res.send({});
          }
        });
      },
      diff: function(req, res, next) {
        var metadata, page, store, v1, v2;
        store = app.get('store');
        page = wiki.filename(req.sanitize(0).trim());
        v1 = req.sanitize(1).trim();
        v1 = v1 !== 'current' ? v1 : null;
        v2 = v2 !== 'current' ? v2 : null;
        metadata = wiki.parsePath(page);
        return async.parallel([
          function(cb) {
            return store.read(page, {
              id: v1
            }, cb);
          }, function(cb) {
            return store.read(page, {
              id: v1
            }, cb);
          }
        ], function(err, pages) {
          if (err) {
            return next(err);
          }
          return res.send({
            metadata: metadata,
            page: page,
            v1: {
              text: pages[0],
              version: v1
            },
            v2: {
              text: pages[1],
              version: v2
            }
          });
        });
      },
      list: function(req, res, next) {
        var metadata, page, store;
        store = app.get('store');
        page = wiki.filename(req.sanitize(0).trim());
        metadata = wiki.parsePath(page);
        return store.list(page, function(err, resources) {
          return res.send({
            resources: resources,
            metadata: metadata
          });
        });
      },
      /**
      		 * Route to view the raw source of a page
      		 * @param  {Request} req Incoming HTTP request
      		 * @param  {Response} res Outgoing HTTP response
      */

      raw: function(req, res) {
        var ext, page, store;
        store = app.get('store');
        page = wiki.filename(req.sanitize(0).trim());
        ext = wiki.extname(page);
        return retrieve(page, {
          encoding: 'buffer',
          maxBuffer: 10 * 1000 * 1024
        }, store, {
          file: function(err, text) {
            res.type(ext);
            return res.send(text);
          },
          folder: function(err, contents) {
            var resource;
            return res.send(((function() {
              var _i, _len, _results;
              _results = [];
              for (_i = 0, _len = contents.length; _i < _len; _i++) {
                resource = contents[_i];
                _results.push(resource.path);
              }
              return _results;
            })()).join('\n'));
          }
        });
      },
      /**
      		 * Route to edit the contents of a page
      		 * @param  {Request} req Incoming HTTP request
      		 * @param  {Response} res Outgoing HTTP response
      */

      edit: function(req, res, next) {
        var author, message, page, store, text;
        store = app.get('store');
        page = wiki.filename(req.sanitize(0).trim());
        text = req.param('text');
        message = req.param('message');
        author = new storejs.Author(req.user.name, req.user.email);
        return store.create(page, text, author, message, function(err, resource) {
          if (err) {
            return next(err);
          }
          return res.send({});
        });
      }
    };
  };

}).call(this);
