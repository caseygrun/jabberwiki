wiki = require('wiki')
Minimatch = require('minimatch').Minimatch
_ = require('underscore')

###*
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
###


###*
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
 * @property {Function} action.next ###

###*
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
###

module.exports = do () ->

	tools = []
	views = []
	editors = []

	init = (app, options) ->

		options = options || {}
		options.tools = options.tools || []
		options.views = options.views || []
		options.editors = options.editors || []
		middleware = options.middleware || []

		# build tools
		tools = for tool in options.tools
			# convert string-based route format to Express-compatible RegExp
			route = wiki.routeToRegExp(tool.route);

			# declare route to handle page
			# TODO: filter pages using the filter pattern somehow
			switch(tool.method)
				when "post" then app.post(route, middleware, tool.action)
				when "get"  then app.get( route, middleware, tool.action)
				else             app.get( route, middleware, tool.action)
			
			tool

		# build views
		views = for view in options.views
			view.filter = new Minimatch(view.filter, {matchBase: true})
			view

		# build editors
		editors = for editor in options.editors
			editor.filter = new Minimatch(editor.filter, {matchBase: true})
			editor

	getView = (page) ->
		_.find views, (view) -> view.filter.match(page)

	getEditor = (page) ->
		_.find editors, (editor) -> editor.filter.match(page)


	return {
		tools: tools
		views: views
		editors: editors
		init: init
		getView: getView
		getEditor: getEditor
	}