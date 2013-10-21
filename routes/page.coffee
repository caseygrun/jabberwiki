async = require('async')
markup = require('markup')
wiki = require('wiki')
storejs = require('revisionary')

###*
 * Determines the type of resource at `page`, retrieves its contents, and passes to the appropriate `callback`. 
 * If a file, retrieves its contents. If a folder, retrieves a list of contained resources. 
 * @param {String} page Path to the page
 * @param {String} [version=null] Version of the page to retrieve, or null to retrieve the latest version
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
retrieve = (page, version, store, callbacks) ->
	callbacks.default ?= () -> 
	callbacks.file ?= callbacks.default
	callbacks.folder ?= callbacks.default
	callbacks.error ?= callbacks.default

	store.type page, null, (err, type) ->
		if err then callbacks.error(err)
		else switch type 
			when "file" then store.read page, version, callbacks.file
			when "folder" then store.list page, callbacks.folder
			else callbacks.default err, type, null


module.exports = (app) ->
	return me = 

		###*
		 * Route to view a page as HTML
		 * @param  {Request} req Incoming HTTP request
		 * @param  {Response} res Outgoing HTTP response
		###
		view: (req,res,next) ->
			store = app.get('store')
			page = wiki.filename req.sanitize(0).trim()
			version = req.sanitize(1).trim() || null

			retrieve page, version, store, {
				'folder': (err, contents) -> return me.list(req,res,next)
				'file': (err,text) ->
					async.waterfall [
						(cb) -> wiki.preprocess(page,text,cb)
						(text,metadata,cb) ->
							format = 'markdown'
							markup.html(text,format,[],(err, html) -> cb(err,html,metadata))

					], (err, html, metadata) -> 
						if err? then return next(err)

						if (html? and metadata?) and (not err?) 
							res.render('pages/view.jade',{
								content: html, 
								title: metadata.title, 
								parents: metadata.parents, 
								version: version })
						else
							res.redirect(wiki.url(page,'edit'))
				'error': (err) -> next(err)
				'default': () -> res.redirect(wiki.url(page,'edit'))
			}

		###*
		 * Route to view an editor for a page, as HTML
		 * @param  {Request} req Incoming HTTP request
		 * @param  {Response} res Outgoing HTTP response
		###
		editor: (req,res,next) ->
			store = app.get('store')
			page = wiki.filename req.sanitize(0).trim()

			async.waterfall [
				(cb) -> store.read page,(err,text) -> 
					# Swallow "file not found" errors
					if err?.code=='ENOENT' or err?.code==128
						cb(null,'')
					else
						cb(err,text) 

				(text,cb) -> wiki.preprocess(page,text,(err,processed,metadata) -> cb(err,text,metadata) )
			], (err,text,metadata) -> 
				# TODO: handle error
				if err then return next(err)

				res.render('pages/editor.jade',{
					content: text, 
					title: metadata.title, 
					parents: metadata.parents,  })

		list: (req,res,next) ->
			store = app.get('store')
			page = wiki.filename req.sanitize(0).trim()
			metadata = wiki.parsePath(page)

			store.list page, (err, resources) ->
				res.render('pages/list.jade',{
					resources: resources, 
					title: metadata.title, 
					parents: metadata.parents, 
					wiki: wiki })

		###*
		 * Route to view the history for a page, as HTML
		 * @param  {Request} req Incoming HTTP request
		 * @param  {Response} res Outgoing HTTP response
		###
		log: (req,res,next) ->
			store = app.get('store')
			page = wiki.filename req.sanitize(0).trim()

			store.log page, (err, revisions) ->
				# TODO: handle error
				if err then return next(err)

				metadata = wiki.parsePath(page)

				res.render('pages/log.jade',{
					title: metadata.title, 
					page: page,
					parents: metadata.parents,
					revisions: revisions || []})

		###*
		 * Compares two versions of a page
		 * @param  {[type]} req [description]
		 * @param  {[type]} res [description]
		 * @param  {Function} next [description]
		 * @return {[type]} [description]
		###
		diff: (req, res, next) ->
			store = app.get('store')
			page = wiki.filename req.sanitize(0).trim()
			v1 = req.sanitize(1).trim()
			v1 = if v1 != 'current' then v1 else null
			v2 = if v2 != 'current' then v2 else null

			metadata = wiki.parsePath(page)

			async.parallel [
				(cb) -> store.read(page, v1, cb), 
				(cb) -> store.read(page, v2, cb)
			], (err, pages) -> 
				if err then return next(err)
				res.render('pages/diff.jade',{
					title: metadata.title,
					page: page,
					v1_page: pages[0],
					v2_page: pages[1],
					v1: v1,
					v2: v2,
				})

		###*
		 * Route to view a printable version of a page as HTML
		 * @param  {Request} req Incoming HTTP request
		 * @param  {Response} res Outgoing HTTP response
		###
		print: (req,res,next) ->
			store = app.get('store')
			page = wiki.filename req.sanitize(0).trim()

			retrieve page, null, store, {
				'folder': (err, contents) -> return me.list(req,res,next)
				'file': (err,text) ->
					async.waterfall [
						(cb) -> wiki.preprocess(page,text,cb)
						(text,metadata,cb) ->
							format = 'markdown'
							markup.html(text,format,[],(err, html) -> cb(err,html,metadata))

					], (err, html, metadata) -> 
						if err? then return next(err)

						if (html? and metadata?) and (not err?) 
							res.render('pages/print.jade',{
								content: html, 
								title: metadata.title, 
								parents: metadata.parents })
						else
							res.redirect(wiki.url(page,'edit'))
				'error': (err) -> next(err)
				'default': () -> res.redirect(wiki.url(page,'edit'))
			}

		###*
		 * Route to convert a page to another markup format using Pandoc, and download the result as text
		 * @param  {Request} req Incoming HTTP request
		 * @param  {Response} res Outgoing HTTP response
		###
		export: (req,res,next) ->
			store = app.get('store')
			page = wiki.filename req.sanitize(0).trim()
			to = req.param(1) || req.param('to')

			retrieve page, null, store, {
				file: (err, text) ->
					if err then return next(err)
					format = 'markdown'	
					markup.convert text, format, to, ['--self-contained'], (err, text) ->
						if err then return next(err)
						
						switch to
							when 'html','slidy','slideous','dzslides','s5'
								res.send(text)
							else
								res.attachment("#{page}.#{to}")
								res.send(text)

				default: (err,type,result) -> res.redirect(wiki.url(page,'view'))
			}

		###*
		 * Route to view the raw source of a page
		 * @param  {Request} req Incoming HTTP request
		 * @param  {Response} res Outgoing HTTP response
		###
		raw: (req, res) ->
			store = app.get('store')
			page = wiki.filename req.sanitize(0).trim()

			retrieve page, null, store, {
				file: (err, text) -> res.send(text)
				folder: (err, contents) -> res.send (resource.path for resource in contents).join('\n')
			}

		###*
		 * Route to edit the contents of a page
		 * @param  {Request} req Incoming HTTP request
		 * @param  {Response} res Outgoing HTTP response
		###
		edit: (req,res,next) ->
			store = app.get('store')

			page = wiki.filename req.sanitize(0).trim()
			text = req.param('text')
			message = req.param('message')
			author = new storejs.Author('Name', 'example@example.com') # TODO

			store.create(page,text,author,message,(err, resource) ->
				# TODO: handle error
				res.redirect(wiki.url(page,'view'))
			)


		###*
		 * Route to remove a page
		 * @param  {Request} req Incoming HTTP request
		 * @param  {Response} res Outgoing HTTP response
		###
		remove: (req,res,next) ->

			
		move: (req,res,next) ->


		discuss:
			view: (req,res,next) ->

			editor: (req,res,next) ->

			edit: (req,res,next) ->