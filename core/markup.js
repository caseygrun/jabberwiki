(function() {
  var async, formats, getFormatOptions, me, pdc, pdcToFile, pipeline, pth, runPandoc, spawn, wiki, _;

  _ = require('underscore');

  async = require('async');

  wiki = require('wiki');

  pth = require('path');

  spawn = require('child_process').spawn;

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

  runPandoc = function(src, args, callback) {
    var err, pandoc, res;
    pandoc = spawn('pandoc', args);
    res = '';
    err = '';
    pandoc.stdout.on('data', function(data) {
      res += data;
      return null;
    });
    pandoc.stderr.on('data', function(data) {
      err += data;
      return null;
    });
    pandoc.on('exit', function(code) {
      if (code !== 0) {
        return callback(new Error('pandoc exited with code ' + code + '. ' + (err || '')));
      } else if (err) {
        return callback(new Error(err));
      } else {
        callback(null, res);
        return null;
      }
    });
    return pandoc.stdin.end(src, 'utf8');
  };

  pdc = function(src, from, to, opt, cb) {
    var args, _ref;
    if (cb == null) {
      cb = opt;
      opt = null;
    }
    args = ['-f', from];
    _ref = getFormatOptions(to, opt), to = _ref[0], opt = _ref[1];
    if (to != null) {
      args = args.concat(['-t', to]);
    }
    if (opt != null) {
      args = args.concat(opt);
    }
    return runPandoc(src, args, cb);
  };

  pdcToFile = function(src, from, to, out, opt, cb) {
    var args, _ref;
    if (cb == null) {
      cb = opt;
      opt = null;
    }
    args = ['-f', from];
    _ref = getFormatOptions(to, opt), to = _ref[0], opt = _ref[1];
    if (to != null) {
      args = args.concat(['-t', to]);
    }
    if (out != null) {
      args = args.concat(['-o', out]);
    }
    if (opt != null) {
      args = args.concat(opt);
    }
    return runPandoc(src, args, cb);
  };

  pipeline = function(text, from, to, options, middleware, callback) {
    var chain, post, pre;
    pre = function(cb) {
      return pdc(text, from, 'json', options, function(err, tree) {
        var e;
        if (err) {
          return cb(err);
        } else {
          try {
            return cb(null, JSON.parse(tree));
          } catch (_error) {
            e = _error;
            return cb(e);
          }
        }
      });
    };
    post = function(tree, cb) {
      var finalText;
      finalText = JSON.stringify(tree);
      return pdc(finalText, 'json', to, options, cb);
    };
    chain = [pre].concat(middleware).concat([post]);
    return async.waterfall(chain, callback);
  };

  module.exports = me = {
    /**
    	 * Runs a pipeline of middleware to process JSON trees from Pandoc
    	 * @param  {String} text Input text
    	 * @param  {String} from Format to use when parsing the input text
    	 * @param  {String} to Final format in which the output should be provided
    	 * @param  {Array} options Array of options to be passed to Pandoc
    	 * 
    	 * @param  {Function[]} middleware 
    	 * Array of functions to be called between the input and output.
    	 * Each function will be passed two arguments:
    	 * 
    	 *     - `currentTree`: a JSON array containing the current Pandoc document tree, 
    	 *        as modified by previous middleware
    	 *     - `next(err, finalTree)`: a callback to be called upon completion of the present middleware
    	 * 
    	 * Each middleware function should modify the passed `currentTree` as suitable, then call `next` 
    	 * with either an `Error` or the modified tree. This modified tree will be passed to subsequent 
    	 * middleware, and so forth.
    	 *
    	 * @param  {Function} callback Callback to be executed upon completion
    	 * @param {Error} callback.err Error if one occurs
    	 * @param {String} callback.output Output text
    */

    pipeline: function(text, from, to, options, middleware, callback) {
      return pipeline(text, from, to, options, middleware, pdc, callback);
    },
    pipelineFile: function(text, from, to, options, middleware, callback) {
      return pipeline(text, from, to, options, middleware, me.convertFile, callback);
    },
    convert: function(text, from, to, options, callback) {
      if (options == null) {
        options = [];
      }
      return pdc(text, from, to, options, callback);
    },
    convertFile: function(text, from, to, options, callback) {
      return wiki.tempFile(function(err, outputFile) {
        if (err) {
          return callback(err);
        }
        return pdcToFile(text, from, to, outputFile, options, function(err, data) {
          return callback(err, outputFile);
        });
      });
    },
    html: function(text, from, options, callback) {
      if (options == null) {
        options = [];
      }
      options = options.concat(['--table-of-contents', '--base-header-level=2', '--mathjax']);
      me.pipeline(text, from, 'html', options, [
        (function(tree, cb) {
          return cb(wiki.replaceWikiLinks(tree));
        }), function(tree, cb) {
          console.log(tree);
          return cb(tree);
        }
      ], callback);
      return pdc(text, from, 'html', options, callback);
    }
  };

}).call(this);
