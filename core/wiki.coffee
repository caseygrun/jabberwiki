pth = require('path')
fs = require('fs')
_ = require('underscore')
async = require('async')
mkdirp = require('mkdirp')
URI = require('URIjs')
tmp = require('tmp')
config = require('../config/config')
dockers = require('dockers')


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
	url: (page,verb='view',id=null) ->
		p = ['/pages',me.filename(page),verb].join('/')
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
		page = if page[0] == '/' then page.substr(1) else page

		if _.last(page) == '/' then page
		else 
			basename = pth.basename page

			if basename.indexOf('.') == -1
				page + '.' + config.pages.defaultPageExt
			else 
				page

	pageRegExp: /([\w\.\/%\(\)\{\}\[\]\- ]+)/, 
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
			parents: parents,
			page: page,
			path: parents.join('/')
		}

	extname: (page) ->
		data = me.parsePath(page)
		data.ext

	###*
	 * Determines the type of resource at `page`, retrieves its contents, and passes to the appropriate `callback`. 
	 * If a file, retrieves its contents. If a folder, retrieves a list of contained resources. 
	 * @param {String} page Path to the page
	 * @param {Object} [options={}] Options
	 * @param {String} [options.id=null] Version of the page to retrieve, or null to retrieve the latest version
	 * @param {Object} callbacks Hash describing several possible callbacks:
	 * 
	 * @param {Function} callbacks.file Callback to be executed if the resource is a file
	 * @param {Error} callbacks.file.err Error if one occurs while reading the contents of a file
	 * @param {String} callbacks.file.text Text of the retrieved page
	 * 
	 * @param {Function} callbacks.folder Callback to be executed if the resource is a folder
	 * @param {Error} callbacks.folder.err Error if one occurs while reading the contents of a folder
	 * @param {store.Resource[]} callbacks.folder.contents Array of resources representing the items contained by the directory
	 * 
	 * @param {Function} callbacks.error Callback to be executed if an error occurs
	 * @param {Error} callbacks.error.err The error
	 *
	 * @param {Function} callbacks.default Callback to be executed if the type of the object is something else
	 * @param {Error} callbacks.default.err Error if one occurs 
	 * @param {String} callbacks.default.type Type returned by the store
	 * @param {Mixed} callbacks.default.results Results if any
	###
	retrieve: (page, options={}, store, callbacks) ->
		callbacks.default ?= () -> 
		callbacks.file ?= callbacks.default
		callbacks.folder ?= callbacks.default
		callbacks.error ?= callbacks.default

		store.type page, null, (err, type) ->
			if err then callbacks.error(err)
			else switch type 
				when "file" then store.read page, options, callbacks.file
				when "folder" then store.list page, callbacks.folder
				else callbacks.default err, type, null

	###*
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
	###
	replaceImagesWithLocals: (store,format) ->

		return (doc, callback) ->
			console.log "Replacing images with local copies..."

			localImages = []
			remoteImages = []
			imageMap = {}

			# filter to find images
			findImages = (key, value, format, meta) ->
				if key == 'Image'
					[text, [url, title]] = value
					parsedUri = URI(url)
					console.log url
					if !parsedUri.protocol() 
						# add to localImages
						localImages.push(url)
						# dockers.filters.elements.Image(text, [url, title])
						null
					else
						# add to remoteImages
						remoteImages.push(url)
						# dockers.filters.elements.Image(text, [url, title])
						null
			
			# filter to rewrite images with data from imageMap
			rewriteImages = (key, value, format, meta) ->
				if key == 'Image'
					[text, [url, title]] = value
					dockers.filters.elements.Image(text, [imageMap[url], title])


			findPipe = dockers.filters.toJSONPipe(findImages, format) 
			
			console.log "Finding images..."

			# find images
			findPipe doc, (err, tree) ->
				
				console.log "Done finding images; localImages: "
				console.log localImages
				console.log "remoteImages: "
				console.log remoteImages

				# download images and save paths in imageMap
				async.parallel [
					(cb) ->
						console.log "Downloading local images..."
						async.eachSeries(localImages, 
							((image, cb) ->
								store.read image, {encoding: 'buffer', maxBuffer: 10*1000*1024}, (err, data) ->
									if err then return cb(err)
									me.tempFile (err, tempPath) ->
										if err then return cb(err)
										tempPath += pth.extname(image)
										console.log "Downloading "+image+" to "+tempPath
										imageMap[image] = tempPath
										fs.writeFile(tempPath, data, cb)
							),
							(err) ->
								console.log "Done downloading local images"
								cb(err)
						)
					(cb) ->
						console.log "Downloading remote images..."
						async.eachSeries(remoteImages, 
							((image, cb) ->
								me.tempFile (err, tempPath) ->
									if err then return cb(err)
									tempPath += pth.extname(image)
									console.log "Downloading "+image+" to "+tempPath
									imageMap[image] = tempPath
									request(image).pipe(fs.createWriteStream(tempPath)).on('end',() -> cb(null))
							),
							(err) ->
								console.log "Done remote local images"
								cb(err)
						)
				], (err) ->
					console.log "Done downloading all images"
					if err then return callback(err)
					
					# rewrite image tags in the document
					console.log "Replacing images..."
					rewritePipe = dockers.filters.toJSONPipe(rewriteImages, format)
					rewritePipe doc, callback



 



	replaceWikiLinks: (format) ->
		rewriteImageUrl = (fileName) ->
			me.fileUrl(fileName)

		wikiLinks = (key, value, format, meta) ->
			if key == 'Link' && value[1][0] == ''
				[text, [url, title]] = value
				url = me.url(dockers.filters.stringify(text))
				return dockers.filters.elements.Link(value[0],[url,title])
			else if key == 'Image'
				[text, [url, title]] = value
				parsedUri = URI(url)
				if !parsedUri.protocol() then dockers.filters.elements.Image(text, [rewriteImageUrl(url), title])

		return dockers.filters.toJSONPipe(wikiLinks, format)

	# replaceWikiLinks: (ast) ->
	# 	makeUrl = (textArray) ->
	# 		pageName = (for item in textArray
	# 			if item == "Space" then " " else if item.Str then item.Str).join('');
	# 		me.url(pageName,'view')

	# 	rewriteImageUrl = (fileName) ->
	# 		me.fileUrl(fileName)


	# 	###
	# 	* @param {Array} ast Array of pandoc objects
	# 	###
	# 	parse = (ast) -> 

	# 		for item in ast

	# 			if item['Link']? 
	# 				text = item.Link[0] 
	# 				uri = item.Link[1][0]
	# 				if not uri then item.Link[1][0] = makeUrl(text)
	# 			if item['Image']?
	# 				uri = item.Image[1][0]
	# 				parsedUri = URI(uri)
	# 				if !parsedUri.protocol() then item.Image[1][0] = rewriteImageUrl(uri)


	# 			else if _.isArray(item) 
	# 				item = parse item

	# 			else if _.isObject(item) 
	# 				for key of item
	# 					if _.isArray(item[key]) then item[key] = parse(item[key])

	# 			item

	# 	parse ast


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


