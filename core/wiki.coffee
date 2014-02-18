pth = require('path')
_ = require('underscore')
mkdirp = require('mkdirp')
URI = require('URIjs')
tmp = require('tmp')
config = require('../config/config')


tempDir = process.env.TMP || process.env.TMPDIR || process.env.TEMP || '/tmp' || process.cwd();


module.exports = me =
	###*
	 * Generates a URL to the wiki's main page based on configuration options
	 * @return {String} url
	###
	mainPage: () ->
		me.url('Main','view')

	###*
	 * Converts a page name and verb, and optionally a revision ID to URL
	 * @param  {String} page Page name
	 * @param  {String} verb Verb (e.g. `edit`, `view`, etc.)
	 * @param  {String} id Revision ID
	 * @return {String} url
	###
	url: (page,verb,id) ->
		p = pth.join('/pages',me.filename(page),verb)
		if id then p = pth.join(p,id)

		encodeURI(p)

	###*
	 * Generates a URL to the raw file for a particular resource
	 * @param  {String} file Path to the page or resource
	 * @return {String} url
	###
	fileUrl: (file) ->
		p = pth.join('/files',me.filename(file))
		encodeURI(p)

	###*
	 * Generates a valid filename for a particular page (appends the default 
	 * file extension if one is missing)
	 * @param  {String} page Page name
	 * @return {String} filename
	###
	filename: (page) ->
		if _.last(page) == '/' then page
		else 
			basename = pth.basename page

			if basename.indexOf('.') == -1
				page + '.' + config.pages.defaultPageExt
			else 
				page

	pageRegExp: /([\w\.\/%\(\)\{\}\[\] ]+)/, 
	varRegExp: /(\w+)/,

	###*
	 * Accepts a string with one or more placeholders for pages or variables; 
	 * converts this pattern into a regular expression that can match URLs.
	 *
	 * Patterns surrounded by [brackets] will be interpreted as placeholders
	 * for wiki pages, and will be allowed to contain slashes. Patterns 
	 * surrounded by {braces} will be interpreted as normal variables.
	 * @param  {String} route Route including placeholders
	 * @return {RegExp} regular expression describing the route
	###
	routeToRegExp: (route) ->

		regExpToStrPartial = (r) ->
			r = r.toString();
			r.substring(1,r.length - 1);

		pageRegExpStr = regExpToStrPartial(me.pageRegExp)
		varRegExpStr = regExpToStrPartial(me.varRegExp)

		# pageRegExpStr = me.pageRegExp.toString()
		# pageRegExpStr = pageRegExpStr.substring(1,pageRegExpStr.length-1)
		# varRegExpStr = me.varRegExp.toString()
		# varRegExpStr = varRegExpStr.substring(1,varRegExpStr.length-1)


		# http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
		route = route.replace(/[\-\/\(\)\*\+\?\.\\\^\$\|]/g, "\\$&")
		route = route.replace(/\[\w+\]/,pageRegExpStr)
		route = route.replace(/\{\w+\}/,varRegExpStr)
		RegExp(route)

	tempFile: (data,cb) ->
		if !cb? 
			cb = data; data = null;

		if data 
			tmp.file(cb)
		else 
			tmp.tmpName(cb)

	###*
	 * Pre-processes a block of text to extract metadata and separate markup to be passed to Pandoc
	 * @param  {String} page Path to the page, including file extension
	 * @param  {String} text Raw text loaded from file
	 * @param  {Function} callback Callback to be executed upon completion
	 * @param {Error} callback.err Error if one occurs during preprocessing
	 * @param {String} callback.markup Markup to be passed to Pandoc
	 * @param {Object} callback.metadata Metadata separated from file and path
	###
	preprocess: (page, text, callback) ->
		markup = text
		metadata = @parsePath(page)
		metadata.format = page.ext || 'md'

		callback(null,markup, metadata)


	#
	parsePath: (page) ->
		basename = pth.basename(page)
		base = basename.split('.')
		ext = _.last(base)
		title = if base.length>1 then _.initial(base).join('.') else _.first(base)

		dirname = pth.dirname(page)
		parents = _.initial page.split(pth.sep)
		
		return {
			title: title,
			ext: ext,
			parents: parents
		}

	replaceWikiLinks: (ast) ->
		makeUrl = (textArray) ->
			pageName = (for item in textArray
				if item == "Space" then " " else if item.Str then item.Str).join('');
			me.url(pageName,'view')

		rewriteImageUrl = (fileName) ->
			me.fileUrl(fileName)


		###
		* @param {Array} ast Array of pandoc objects
		###
		parse = (ast) -> 

			for item in ast

				if item['Link']? 
					text = item.Link[0] 
					uri = item.Link[1][0]
					if not uri then item.Link[1][0] = makeUrl(text)
				if item['Image']?
					uri = item.Image[1][0]
					parsedUri = URI(uri)
					if !parsedUri.protocol() then item.Image[1][0] = rewriteImageUrl(uri)


				else if _.isArray(item) 
					item = parse item

				else if _.isObject(item) 
					for key of item
						if _.isArray(item[key]) then item[key] = parse(item[key])

				item

		parse ast


	###*
	 * Gets the path to a directory for writing temporary files
	 * @param  {Function} callback Callback to be executed upon creation/location of the directory
	 * @param {Error} callback.err An error if one occurs
	 * @param {String} callback.tempPath Path to a temporary directory, or null
	###
	tempDir: (callback) ->
		tempDir = 'temp';
		mkdirp tempDir,(err) ->
			callback(err, if not err? then tempDir else null)


