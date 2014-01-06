(function() {
  var async, dockers, formats, getFormatOptions, me, pth, spawn, wiki, _;

  _ = require('underscore');

  async = require('async');

  wiki = require('wiki');

  pth = require('path');

  spawn = require('child_process').spawn;

  dockers = require('dockers');

  formats = {
    'pdf': [null, []]
  };

  getFormatOptions = function(to, opt) {
    if (formats[to]) {
      opt.concat(formats[to][1]);
      to = formats[to][0];
    }
    return [to, opt];
  };

  module.exports = me = {
    pipeline: function(text, from, to, options, middleware, callback) {
      return dockers.pipeline(text, from, to, options, middleware, callback);
    },
    pipelineFile: function(text, from, to, options, middleware, callback) {},
    convert: function(text, from, to, options, callback) {
      if (options == null) {
        options = [];
      }
      return dockers.convert(text, from, to, options, callback);
    },
    convertFile: function(text, from, to, options, callback) {
      return dockers.convertFile(text, from, to, options, callback);
    },
    /**
    	 * Converts input `text` from a source format to HTML after performing wiki-link replacement
    	 * @param  {String} text Input text
    	 * @param  {String} from Input format (e.g. `markdown`, `html`, `latex`, etc.)
    	 * @param  {String[]} [options=[]] Array of command line arguments
    	 * @param  {Function} callback Callback to be executed upon completion
    	 * @param  {Error} callback.err Error if one occurs
    	 * @param  {String} callback.result Output text
    */

    html: function(text, from, options, callback) {
      if (options == null) {
        options = [];
      }
      options = options.concat(['--base-header-level=2', '--mathjax', '--smart']);
      return me.pipeline(text, from, 'html5', options, [
        (function(tree, cb) {
          return cb(null, wiki.replaceWikiLinks(tree));
        })
      ], callback);
    }
  };

}).call(this);
