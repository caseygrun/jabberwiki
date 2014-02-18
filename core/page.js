(function() {
  var wiki;

  wiki = require('wiki');

  /**
   * @class Tool
   * Represents an action that can be taken on a particlar page
   * 
   * @property {String} filter 
   * Minimatch-compatible pattern describing to which pages this tool applies 
   *
   * @property {RegExp/String} route 
   * Route to which this tool should respond
   * 
   * @property {String} method 
   * HTTP verb to which this tool should respond
   *
   * @property {Function} action 
   * Function which produces the page output
   *
  */


  /**
   * @class  View
   * Represents a renderer for a particular type of page
   * 
   * @property {String} filter 
   * Minimatch-compatible pattern describing to which pages this view applies 
   *
   * @property {String} [propName] [description]
  */


  /**
   * @class  Editor
   * Represents an editor for a particular type of page
   * @property {String} filter 
   * Minimatch-compatible pattern describing to which pages this editor applies
  */


  module.exports = (function() {
    var editors, init, tools, views;
    tools = [];
    views = [];
    editors = [];
    init = function(app, options) {
      var middleware, route, tool, view;
      options = options || {};
      options.tools = options.tools || [];
      options.views = options.views || [];
      middleware = options.middleware || [];
      tools = (function() {
        var _i, _len, _ref, _results;
        _ref = options.tools;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          tool = _ref[_i];
          route = wiki.routeToRegExp(tool.route);
          switch (tool.method) {
            case "post":
              app.post(route, middleware, tool.action);
              break;
            case "get":
              app.get(route, middleware, tool.action);
              break;
            default:
              app.get(route, middleware, tool.action);
          }
          _results.push(tool);
        }
        return _results;
      })();
      return views = (function() {
        var _i, _len, _ref, _results;
        _ref = options.views;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          view = _ref[_i];
          _results.push(view);
        }
        return _results;
      })();
    };
    return {
      tools: tools,
      views: views,
      editors: editors,
      init: init
    };
  })();

}).call(this);
