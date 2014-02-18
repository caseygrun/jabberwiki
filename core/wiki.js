(function() {
  var URI, config, me, mkdirp, pth, tempDir, tmp, _;

  pth = require('path');

  _ = require('underscore');

  mkdirp = require('mkdirp');

  URI = require('URIjs');

  tmp = require('tmp');

  config = require('../config/config');

  tempDir = process.env.TMP || process.env.TMPDIR || process.env.TEMP || '/tmp' || process.cwd();

  module.exports = me = {
    /**
    	 * Generates a URL to the wiki's main page based on configuration options
    	 * @return {String} url
    */

    mainPage: function() {
      return me.url('Main', 'view');
    },
    /**
    	 * Converts a page name and verb, and optionally a revision ID to URL
    	 * @param  {String} page Page name
    	 * @param  {String} verb Verb (e.g. `edit`, `view`, etc.)
    	 * @param  {String} id Revision ID
    	 * @return {String} url
    */

    url: function(page, verb, id) {
      var p;
      p = pth.join('/pages', me.filename(page), verb);
      if (id) {
        p = pth.join(p, id);
      }
      return encodeURI(p);
    },
    /**
    	 * Generates a URL to the raw file for a particular resource
    	 * @param  {String} file Path to the page or resource
    	 * @return {String} url
    */

    fileUrl: function(file) {
      var p;
      p = pth.join('/files', me.filename(file));
      return encodeURI(p);
    },
    /**
    	 * Generates a valid filename for a particular page (appends the default 
    	 * file extension if one is missing)
    	 * @param  {String} page Page name
    	 * @return {String} filename
    */

    filename: function(page) {
      var basename;
      if (_.last(page) === '/') {
        return page;
      } else {
        basename = pth.basename(page);
        if (basename.indexOf('.') === -1) {
          return page + '.' + config.pages.defaultPageExt;
        } else {
          return page;
        }
      }
    },
    pageRegExp: /([\w\.\/%\(\)\{\}\[\] ]+)/,
    varRegExp: /(\w+)/,
    /**
    	 * Accepts a string with one or more placeholders for pages or variables; 
    	 * converts this pattern into a regular expression that can match URLs.
    	 *
    	 * Patterns surrounded by [brackets] will be interpreted as placeholders
    	 * for wiki pages, and will be allowed to contain slashes. Patterns 
    	 * surrounded by {braces} will be interpreted as normal variables.
    	 * @param  {String} route Route including placeholders
    	 * @return {RegExp} regular expression describing the route
    */

    routeToRegExp: function(route) {
      var pageRegExpStr, regExpToStrPartial, varRegExpStr;
      regExpToStrPartial = function(r) {
        r = r.toString();
        return r.substring(1, r.length - 1);
      };
      pageRegExpStr = regExpToStrPartial(me.pageRegExp);
      varRegExpStr = regExpToStrPartial(me.varRegExp);
      route = route.replace(/[\-\/\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
      route = route.replace(/\[\w+\]/, pageRegExpStr);
      route = route.replace(/\{\w+\}/, varRegExpStr);
      return RegExp(route);
    },
    tempFile: function(data, cb) {
      if (cb == null) {
        cb = data;
        data = null;
      }
      if (data) {
        return tmp.file(cb);
      } else {
        return tmp.tmpName(cb);
      }
    },
    /**
    	 * Pre-processes a block of text to extract metadata and separate markup to be passed to Pandoc
    	 * @param  {String} page Path to the page, including file extension
    	 * @param  {String} text Raw text loaded from file
    	 * @param  {Function} callback Callback to be executed upon completion
    	 * @param {Error} callback.err Error if one occurs during preprocessing
    	 * @param {String} callback.markup Markup to be passed to Pandoc
    	 * @param {Object} callback.metadata Metadata separated from file and path
    */

    preprocess: function(page, text, callback) {
      var markup, metadata;
      markup = text;
      metadata = this.parsePath(page);
      metadata.format = page.ext || 'md';
      return callback(null, markup, metadata);
    },
    parsePath: function(page) {
      var base, basename, dirname, ext, parents, title;
      basename = pth.basename(page);
      base = basename.split('.');
      ext = _.last(base);
      title = base.length > 1 ? _.initial(base).join('.') : _.first(base);
      dirname = pth.dirname(page);
      parents = _.initial(page.split(pth.sep));
      return {
        title: title,
        ext: ext,
        parents: parents
      };
    },
    replaceWikiLinks: function(ast) {
      var makeUrl, parse, rewriteImageUrl;
      makeUrl = function(textArray) {
        var item, pageName;
        pageName = ((function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = textArray.length; _i < _len; _i++) {
            item = textArray[_i];
            if (item === "Space") {
              _results.push(" ");
            } else if (item.Str) {
              _results.push(item.Str);
            } else {
              _results.push(void 0);
            }
          }
          return _results;
        })()).join('');
        return me.url(pageName, 'view');
      };
      rewriteImageUrl = function(fileName) {
        return me.fileUrl(fileName);
      };
      /*
      		* @param {Array} ast Array of pandoc objects
      */

      parse = function(ast) {
        var item, key, parsedUri, text, uri, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = ast.length; _i < _len; _i++) {
          item = ast[_i];
          if (item['Link'] != null) {
            text = item.Link[0];
            uri = item.Link[1][0];
            if (!uri) {
              item.Link[1][0] = makeUrl(text);
            }
          }
          if (item['Image'] != null) {
            uri = item.Image[1][0];
            parsedUri = URI(uri);
            if (!parsedUri.protocol()) {
              item.Image[1][0] = rewriteImageUrl(uri);
            }
          } else if (_.isArray(item)) {
            item = parse(item);
          } else if (_.isObject(item)) {
            for (key in item) {
              if (_.isArray(item[key])) {
                item[key] = parse(item[key]);
              }
            }
          }
          _results.push(item);
        }
        return _results;
      };
      return parse(ast);
    },
    /**
    	 * Gets the path to a directory for writing temporary files
    	 * @param  {Function} callback Callback to be executed upon creation/location of the directory
    	 * @param {Error} callback.err An error if one occurs
    	 * @param {String} callback.tempPath Path to a temporary directory, or null
    */

    tempDir: function(callback) {
      tempDir = 'temp';
      return mkdirp(tempDir, function(err) {
        return callback(err, err == null ? tempDir : null);
      });
    }
  };

}).call(this);
