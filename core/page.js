(function() {
  var Minimatch, wiki, _;

  wiki = require('wiki');

  Minimatch = require('minimatch').Minimatch;

  _ = require('underscore');

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
   * @property {Function} action 
   * Function that generates the view. 
   *
   * @property {String} action.text 
   * @property {Object} action.metadata
   * @property {Request} action.req 
   * @property {Response} action.res
   * @property {Function} action.next
  */


  /**
   * @class  Editor
   * Represents an editor for a particular type of page
   * 
   * @property {String} filter 
   * Minimatch-compatible pattern describing to which pages this editor applies 
   *
   * @property {Function} action 
   * Function that generates the editor. 
   *
   * @property {String} action.text 
   * @property {Object} action.metadata
   * @property {Request} action.req 
   * @property {Response} action.res
   * @property {Function} action.next  
   *
  */


  module.exports = (function() {
    var editors, getEditor, getView, init, tools, views;
    tools = [];
    views = [];
    editors = [];
    init = function(app, options) {
      var editor, middleware, route, tool, view;
      options = options || {};
      options.tools = options.tools || [];
      options.views = options.views || [];
      options.editors = options.editors || [];
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
      views = (function() {
        var _i, _len, _ref, _results;
        _ref = options.views;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          view = _ref[_i];
          view.filter = new Minimatch(view.filter, {
            matchBase: true
          });
          _results.push(view);
        }
        return _results;
      })();
      return editors = (function() {
        var _i, _len, _ref, _results;
        _ref = options.editors;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          editor = _ref[_i];
          editor.filter = new Minimatch(editor.filter, {
            matchBase: true
          });
          _results.push(editor);
        }
        return _results;
      })();
    };
    getView = function(page) {
      return _.find(views, function(view) {
        return view.filter.match(page);
      });
    };
    getEditor = function(page) {
      return _.find(editors, function(editor) {
        return editor.filter.match(page);
      });
    };
    return {
      tools: tools,
      views: views,
      editors: editors,
      init: init,
      getView: getView,
      getEditor: getEditor
    };
  })();

}).call(this);
