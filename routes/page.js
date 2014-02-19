(function() {
  var async, markup, retrieve, storejs, wiki;

  async = require('async');

  markup = require('markup');

  wiki = require('wiki');

  storejs = require('revisionary');

  /**
   * Determines the type of resource at `page`, retrieves its contents, and passes to the appropriate `callback`. 
   * If a file, retrieves its contents. If a folder, retrieves a list of contained resources. 
   * @param {String} page Path to the page
   * @param {String} [version=null] Version of the page to retrieve, or null to retrieve the latest version
   * @param {Object} callbacks Hash describing several possible callbacks:
   * 
   * @param {Function} callbacks.file Callback to be executed if the resource is a file
   * @param {Error} callbacks.file.err Error if one occurs while reading the contents of a file
   * @param {String} callbacks.file.text Text of the retrieved page
   * 
   * @param {Function} callbacks.folder Callback to be executed if the resource is a folder
   * @param {Error} callbacks.folder.err Error if one occurs while reading the contents of a folder
   * @param {store.Resource[]} callbacks.folder.contents Array of resources representing the items contained by the directory
   * 
   * @param {Function} callbacks.error Callback to be executed if an error occurs
   * @param {Error} callbacks.error.err The error
   *
   * @param {Function} callbacks.default Callback to be executed if the type of the object is something else
   * @param {Error} callbacks.default.err Error if one occurs 
   * @param {String} callbacks.default.type Type returned by the store
   * @param {Mixed} callbacks.default.results Results if any
  */


  retrieve = function(page, version, store, callbacks) {
    if (callbacks["default"] == null) {
      callbacks["default"] = function() {};
    }
    if (callbacks.file == null) {
      callbacks.file = callbacks["default"];
    }
    if (callbacks.folder == null) {
      callbacks.folder = callbacks["default"];
    }
    if (callbacks.error == null) {
      callbacks.error = callbacks["default"];
    }
    return store.type(page, null, function(err, type) {
      if (err) {
        return callbacks.error(err);
      } else {
        switch (type) {
          case "file":
            return store.read(page, version, callbacks.file);
          case "folder":
            return store.list(page, callbacks.folder);
          default:
            return callbacks["default"](err, type, null);
        }
      }
    });
  };

  module.exports = function(app) {
    var me;
    return me = {
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
        return retrieve(page, version, store, {
          'folder': function(err, contents) {
            return me.list(req, res, next);
          },
          'file': function(err, text) {
            return async.waterfall([
              function(cb) {
                return wiki.preprocess(page, text, cb);
              }, function(text, metadata, cb) {
                var format;
                format = 'markdown';
                return markup.html(text, format, [], function(err, html) {
                  return cb(err, html, metadata);
                });
              }
            ], function(err, html, metadata) {
              if (err != null) {
                return next(err);
              }
              if (((html != null) && (metadata != null)) && (err == null)) {
                return res.render('pages/view.jade', {
                  content: html,
                  title: metadata.title,
                  parents: metadata.parents,
                  version: version
                });
              } else {
                return res.redirect(wiki.url(page, 'edit'));
              }
            });
          },
          'error': function(err) {
            return next(err);
          },
          'default': function() {
            return res.redirect(wiki.url(page, 'edit'));
          }
        });
      },
      /**
      		 * Route to view an editor for a page, as HTML
      		 * @param  {Request} req Incoming HTTP request
      		 * @param  {Response} res Outgoing HTTP response
      */

      editor: function(req, res, next) {
        var page, store;
        store = app.get('store');
        page = wiki.filename(req.sanitize(0).trim());
        console.log(page);
        return async.waterfall([
          function(cb) {
            return store.read(page, function(err, text) {
              if ((err != null ? err.code : void 0) === 'ENOENT' || (err != null ? err.code : void 0) === 128) {
                return cb(null, '');
              } else {
                return cb(err, text);
              }
            });
          }, function(text, cb) {
            return wiki.preprocess(page, text, function(err, processed, metadata) {
              return cb(err, text, metadata);
            });
          }
        ], function(err, text, metadata) {
          if (err) {
            return next(err);
          }
          return res.render('pages/editor.jade', {
            content: text,
            title: metadata.title,
            parents: metadata.parents
          });
        });
      },
      list: function(req, res, next) {
        var metadata, page, store;
        store = app.get('store');
        page = wiki.filename(req.sanitize(0).trim());
        metadata = wiki.parsePath(page);
        return store.list(page, function(err, resources) {
          return res.render('pages/list.jade', {
            resources: resources,
            title: metadata.title,
            parents: metadata.parents,
            wiki: wiki
          });
        });
      },
      /**
      		 * Route to view the history for a page, as HTML
      		 * @param  {Request} req Incoming HTTP request
      		 * @param  {Response} res Outgoing HTTP response
      */

      log: function(req, res, next) {
        var page, store;
        store = app.get('store');
        page = wiki.filename(req.sanitize(0).trim());
        return store.log(page, function(err, revisions) {
          var metadata;
          if (err) {
            return next(err);
          }
          metadata = wiki.parsePath(page);
          return res.render('pages/log.jade', {
            title: metadata.title,
            page: page,
            parents: metadata.parents,
            revisions: revisions || []
          });
        });
      },
      /**
      		 * Compares two versions of a page
      		 * @param  {[type]} req [description]
      		 * @param  {[type]} res [description]
      		 * @param  {Function} next [description]
      		 * @return {[type]} [description]
      */

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
            return store.read(page, v1, cb);
          }, function(cb) {
            return store.read(page, v2, cb);
          }
        ], function(err, pages) {
          if (err) {
            return next(err);
          }
          return res.render('pages/diff.jade', {
            title: metadata.title,
            page: page,
            v1_page: pages[0],
            v2_page: pages[1],
            v1: v1,
            v2: v2
          });
        });
      },
      /**
      		 * Route to view a printable version of a page as HTML
      		 * @param  {Request} req Incoming HTTP request
      		 * @param  {Response} res Outgoing HTTP response
      */

      print: function(req, res, next) {
        var page, store;
        store = app.get('store');
        page = wiki.filename(req.sanitize(0).trim());
        return retrieve(page, null, store, {
          'folder': function(err, contents) {
            return me.list(req, res, next);
          },
          'file': function(err, text) {
            return async.waterfall([
              function(cb) {
                return wiki.preprocess(page, text, cb);
              }, function(text, metadata, cb) {
                var format;
                format = 'markdown';
                return markup.html(text, format, [], function(err, html) {
                  return cb(err, html, metadata);
                });
              }
            ], function(err, html, metadata) {
              if (err != null) {
                return next(err);
              }
              if (((html != null) && (metadata != null)) && (err == null)) {
                return res.render('pages/print.jade', {
                  content: html,
                  title: metadata.title,
                  parents: metadata.parents
                });
              } else {
                return res.redirect(wiki.url(page, 'edit'));
              }
            });
          },
          'error': function(err) {
            return next(err);
          },
          'default': function() {
            return res.redirect(wiki.url(page, 'edit'));
          }
        });
      },
      /**
      		 * Route to convert a page to another markup format using Pandoc, and download the result as text
      		 * @param  {Request} req Incoming HTTP request
      		 * @param  {Response} res Outgoing HTTP response
      */

      "export": function(req, res, next) {
        var page, store, to;
        store = app.get('store');
        page = wiki.filename(req.sanitize(0).trim());
        to = req.param(1) || req.param('to');
        return retrieve(page, null, store, {
          file: function(err, text) {
            var format;
            if (err) {
              return next(err);
            }
            format = 'markdown';
            switch (to) {
              case 'docx':
              case 'pdf':
                return markup.convertFile(text, format, to, ['--self-contained'], function(err, filename) {
                  if (err) {
                    return next(err);
                  }
                  return res.download(filename, "" + page + "." + to, function(err) {
                    if (err) {
                      return next(err);
                    }
                  });
                });
              default:
                return markup.convert(text, format, to, ['--self-contained'], function(err, text) {
                  if (err) {
                    return next(err);
                  }
                  switch (to) {
                    case 'html':
                    case 'slidy':
                    case 'slideous':
                    case 'dzslides':
                    case 's5':
                      return res.send(text);
                    default:
                      res.attachment("" + page + "." + to);
                      return res.send(text);
                  }
                });
            }
          },
          "default": function(err, type, result) {
            return res.redirect(wiki.url(page, 'view'));
          }
        });
      },
      /**
      		 * Route to view the raw source of a page
      		 * @param  {Request} req Incoming HTTP request
      		 * @param  {Response} res Outgoing HTTP response
      */

      raw: function(req, res) {
        var page, store;
        store = app.get('store');
        page = wiki.filename(req.sanitize(0).trim());
        return retrieve(page, null, store, {
          file: function(err, text) {
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
        author = new storejs.Author('Name', 'example@example.com');
        return store.create(page, text, author, message, function(err, resource) {
          return res.redirect(wiki.url(page, 'view'));
        });
      },
      /**
      		 * Route to remove a page
      		 * @param  {Request} req Incoming HTTP request
      		 * @param  {Response} res Outgoing HTTP response
      */

      remove: function(req, res, next) {},
      move: function(req, res, next) {},
      discuss: {
        view: function(req, res, next) {},
        editor: function(req, res, next) {},
        edit: function(req, res, next) {}
      }
    };
  };

}).call(this);
