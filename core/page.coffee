wiki = require('wiki')


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
 * @property {String} [propName] [description]
###

###*
 * @class  Editor
 * Represents an editor for a particular type of page
 * @property {String} filter 
 * Minimatch-compatible pattern describing to which pages this editor applies 
###

module.exports = do () ->

	tools = []
	views = []
	editors = []

	init = (app, options) ->

		options = options || {}
		options.tools = options.tools || []
		options.views = options.views || []
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
			view

	return {
		tools: tools
		views : views
		editors: editors
		init: init
	}