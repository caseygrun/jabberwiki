(function() {
  var URI, async, config, dockers, fs, me, mkdirp, pth, tempDir, tmp, _;

  pth = require('path');

  fs = require('fs');

  _ = require('underscore');

  async = require('async');

  mkdirp = require('mkdirp');

  URI = require('URIjs');

  tmp = require('tmp');

  config = require('../config/config');

  dockers = require('dockers');

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
      if (verb == null) {
        verb = 'view';
      }
      if (id == null) {
        id = null;
      }
      p = ['/pages', me.filename(page), verb].join('/');
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
      page = page[0] === '/' ? page.substr(1) : page;
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
    pageRegExp: /([\w\.\/%\(\)\{\}\[\]\- ]+)/,
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
        parents: parents,
        page: page,
        path: parents.join('/')
      };
    },
    extname: function(page) {
      var data;
      data = me.parsePath(page);
      return data.ext;
    },
    /**
    	 * Generates an asynchronous JSON pipe that looks for image links in a 
    	 * Pandoc tree, downloads those images from `store` into wiki#tempFile s  
    	 * and replaces the images in the document with references.
    	 * @param  {store.Store} store Store from which to pull images
    	 * @param  {String} format Output format
    	 * @return {Function} replacePipe
    	 * 
    	 * @return {Object} return.doc Pandoc document
    	 * @return {Function} return.callback Callback to be passed the rewritten document
    	 * @return {Error} return.callback.err
    	 * @return {Object} return.callback.modifiedDoc
    */

    replaceImagesWithLocals: function(store, format) {
      return function(doc, callback) {
        var findImages, findPipe, imageMap, localImages, remoteImages, rewriteImages;
        console.log("Replacing images with local copies...");
        localImages = [];
        remoteImages = [];
        imageMap = {};
        findImages = function(key, value, format, meta) {
          var parsedUri, text, title, url, _ref;
          if (key === 'Image') {
            text = value[0], (_ref = value[1], url = _ref[0], title = _ref[1]);
            parsedUri = URI(url);
            console.log(url);
            if (!parsedUri.protocol()) {
              localImages.push(url);
              return null;
            } else {
              remoteImages.push(url);
              return null;
            }
          }
        };
        rewriteImages = function(key, value, format, meta) {
          var text, title, url, _ref;
          if (key === 'Image') {
            text = value[0], (_ref = value[1], url = _ref[0], title = _ref[1]);
            return dockers.filters.elements.Image(text, [imageMap[url], title]);
          }
        };
        findPipe = dockers.filters.toJSONPipe(findImages, format);
        console.log("Finding images...");
        return findPipe(doc, function(err, tree) {
          console.log("Done finding images; localImages: ");
          console.log(localImages);
          console.log("remoteImages: ");
          console.log(remoteImages);
          return async.parallel([
            function(cb) {
              console.log("Downloading local images...");
              return async.eachSeries(localImages, (function(image, cb) {
                return store.read(image, {
                  encoding: 'buffer',
                  maxBuffer: 10 * 1000 * 1024
                }, function(err, data) {
                  if (err) {
                    return cb(err);
                  }
                  return me.tempFile(function(err, tempPath) {
                    if (err) {
                      return cb(err);
                    }
                    tempPath += pth.extname(image);
                    console.log("Downloading " + image + " to " + tempPath);
                    imageMap[image] = tempPath;
                    return fs.writeFile(tempPath, data, cb);
                  });
                });
              }), function(err) {
                console.log("Done downloading local images");
                return cb(err);
              });
            }, function(cb) {
              console.log("Downloading remote images...");
              return async.eachSeries(remoteImages, (function(image, cb) {
                return me.tempFile(function(err, tempPath) {
                  if (err) {
                    return cb(err);
                  }
                  tempPath += pth.extname(image);
                  console.log("Downloading " + image + " to " + tempPath);
                  imageMap[image] = tempPath;
                  return request(image).pipe(fs.createWriteStream(tempPath)).on('end', function() {
                    return cb(null);
                  });
                });
              }), function(err) {
                console.log("Done remote local images");
                return cb(err);
              });
            }
          ], function(err) {
            var rewritePipe;
            console.log("Done downloading all images");
            if (err) {
              return callback(err);
            }
            console.log("Replacing images...");
            rewritePipe = dockers.filters.toJSONPipe(rewriteImages, format);
            return rewritePipe(doc, callback);
          });
        });
      };
    },
    replaceWikiLinks: function(format) {
      var rewriteImageUrl, wikiLinks;
      rewriteImageUrl = function(fileName) {
        return me.fileUrl(fileName);
      };
      wikiLinks = function(key, value, format, meta) {
        var parsedUri, text, title, url, _ref, _ref1;
        if (key === 'Link' && value[1][0] === '') {
          text = value[0], (_ref = value[1], url = _ref[0], title = _ref[1]);
          url = me.url(dockers.filters.stringify(text));
          return dockers.filters.elements.Link(value[0], [url, title]);
        } else if (key === 'Image') {
          text = value[0], (_ref1 = value[1], url = _ref1[0], title = _ref1[1]);
          parsedUri = URI(url);
          if (!parsedUri.protocol()) {
            return dockers.filters.elements.Image(text, [rewriteImageUrl(url), title]);
          }
        }
      };
      return dockers.filters.toJSONPipe(wikiLinks, format);
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
