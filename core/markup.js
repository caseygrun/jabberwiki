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
    pipeline: function(text, options, middleware, callback) {
      return dockers.pipeline(text, options, middleware, callback);
    },
    pipelineFile: function(text, options, middleware, callback) {},
    convert: function(text, options, callback) {
      if (options == null) {
        options = {};
      }
      return dockers.convert(text, options, callback);
    },
    convertFile: function(text, options, callback) {
      if (options == null) {
        options = {};
      }
      return dockers.convertFile(text, options, callback);
    },
    /**
    	 * Converts input `text` from a source format to HTML after performing wiki-link replacement
    	 * @param  {String} text Input text
    	 * @param  {Object} [options={}] Hash of command line arguments
    	 * @param  {Function} callback Callback to be executed upon completion
    	 * @param  {Error} callback.err Error if one occurs
    	 * @param  {String} callback.result Output text
    */

    html: function(text, options, callback) {
      if (options == null) {
        options = {};
      }
      options = _.extend({
        to: 'html5',
        '--base-header-level': '2',
        '--mathjax': true,
        '--smart': true
      }, options);
      return me.pipeline(text, options, [
        (function(tree, cb) {
          return cb(null, wiki.replaceWikiLinks(tree));
        })
      ], callback);
    }
  };

}).call(this);
