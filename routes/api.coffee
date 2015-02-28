fs = require('fs')
pth = require('path')
async = require('async')
markup = require('markup')
wiki = require('wiki')
storejs = require('revisionary')


module.exports = (app) ->
	me = 
		index: (req,res,next) ->
			store = app.get('store')

			store.list '/', (err, resources) ->
				if err? then return next(err)
				res.send(resources)

		all: (req, res, next) ->
			store = app.get('store')

			store.all '/', (err, resources) ->
				if err? then return next(err)
				res.send(resources)
			

		go: (req,res,next) ->
			action = req.param('action')
			term = req.param('search')

			switch action 
				when 'go'
					res.redirect(wiki.url(term,'view'))
				when 'search'
					return me.search(req,res,next)

		search: (req,res,next) ->
			term = req.param('search')
			store = app.get('store')

			store.search term, {}, (err, matches) ->
				if err then return next(err)
				res.send(matches)

		preview: (req, res, next) ->
			text = req.param('text')
			format = req.param('format')

			markup.html text, {from: format}, (err, html) ->
				if err? then return next(err)
				res.send(html)

		recent: (req, res, next) ->
			store = app.get('store')

			store.log '', (err, revisions) ->
				if err then return next(err)
				res.send(revisions)				


		upload: (req,res,next) ->
			if req.files?.upload?.path? 
				file = req.files.upload
				store = app.get('store')
				author = new storejs.Author(req.user.name, req.user.email)
				message = "Uploaded file: #{file.name}"

				# read temporary file
				fs.readFile file.path,(err, data) ->
					if err then return res.send({ error: 'Could not read uploaded file.' })
					
					# generate path to new resource
					newPath = pth.join(req.param('path') || '', file.name)

					# commit new resource to repository
					store.create newPath, data, author, message, (err, resource) ->
						if err  
							app.get('log').error(err);
							res.send(500,{ error: err.message, filename: resource?.path })
						else 
							res.send({ filename: resource?.path })
			else
				res.send({ error: 'No upload found.' })

		###*
		 * Route to view a page as HTML
		 * @param  {Request} req Incoming HTTP request
		 * @param  {Response} res Outgoing HTTP response
		###
		view: (req,res,next) ->
			store = app.get('store')
			page = wiki.filename req.sanitize(0).trim()
			version = req.sanitize(1).trim() || null

			wiki.retrieve page, {id: version}, store, {
				'folder': (err, contents) -> return me.list(req,res,next)
				'file': (err,text) ->
					if err? then return next(err)

					if not text then return res.redirect(wiki.url(page,'edit'))

					wiki.preprocess page,text, (err, text, metadata) ->
						if err? then return next(err)
						metadata.version = version

						res.send {text: text, metadata: metadata }

				'error': (err) -> next(err)
				'default': () -> res.send {}
			}

		diff: (req, res, next) ->
			store = app.get('store')
			page = wiki.filename req.sanitize(0).trim()
			v1 = req.sanitize(1).trim()
			v1 = if v1 != 'current' then v1 else null
			v2 = if v2 != 'current' then v2 else null

			metadata = wiki.parsePath(page)

			async.parallel [
				(cb) -> store.read(page, {id: v1}, cb), 
				(cb) -> store.read(page, {id: v1}, cb)
			], (err, pages) -> 
				if err then return next(err)
				res.send {
					metadata: metadata,
					page: page,
					v1: { text: pages[0], version: v1 },
					v2: { text: pages[1], version: v2 }
				})


		list: (req,res,next) ->
			store = app.get('store')
			page = wiki.filename req.sanitize(0).trim()
			metadata = wiki.parsePath(page)

			store.list page, (err, resources) ->
				res.send {
					resources: resources, 
					metadata: metadata,
				}

		###*
		 * Route to view the raw source of a page
		 * @param  {Request} req Incoming HTTP request
		 * @param  {Response} res Outgoing HTTP response
		###
		raw: (req, res) ->
			store = app.get('store')
			page = wiki.filename req.sanitize(0).trim()
			ext = wiki.extname page

			retrieve page, { encoding: 'buffer', maxBuffer: 10*1000*1024 }, store, {
				file: (err, text) ->
					res.type(ext)
					res.send(text)
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
			author = new storejs.Author(req.user.name, req.user.email) # TODO

			store.create page, text, author, message, (err, resource) ->
				if err then return next(err)
				res.send {}


