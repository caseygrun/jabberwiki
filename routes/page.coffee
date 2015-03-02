async = require('async')
markup = require('markup')
wiki = require('wiki')
storejs = require('revisionary')

retrieve = wiki.retrieve

module.exports = (app) ->
	return me = 
		views:
			image: (text, metadata, req, res, next) -> 
				res.render('pages/image.jade', { metadata: metadata })

			default: (text, metadata, req, res, next) ->
				format = metadata.ext
				format = if format == 'md' then 'markdown' else format
				markup.html text,{from: format}, (err, html) -> 
					if err? then return next(err)
					if (html? and metadata?) and (not err?) 
						res.render('pages/view.jade',{
							content: html, 
							metadata: metadata })

		editors:
			default: (text, metadata, req, res, next) ->
				res.render('pages/editor.jade',{
					content: text, 
					metadata: metadata  })

		differs:
			default: () ->

		###*
		 * Route to view a page as HTML
		 * @param  {Request} req Incoming HTTP request
		 * @param  {Response} res Outgoing HTTP response
		###
		view: (req,res,next) ->
			store = app.get('store')
			page = wiki.filename req.sanitize(0).trim()
			version = req.sanitize(1).trim() || null

			retrieve page, {id: version}, store, {
				'folder': (err, contents) -> return me.list(req,res,next)
				'file': (err,text) ->
					if err? then return next(err)

					if not text then return res.redirect(wiki.url(page,'edit'))

					wiki.preprocess page,text, (err, text, metadata) ->
						if err? then return next(err)
						metadata.version = version

						view = app.pages.getView(page)
						if not view?.action? then return next(new Error('No view found for this page type!'))
						else
							return view.action(text, metadata, req, res, next)

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
				(cb) -> store.read page,null,(err,text) -> 
					# Swallow "file not found" errors
					if err?.code=='ENOENT' or err?.code==128
						cb(null,'')
					else
						cb(err,text) 

				(text,cb) -> wiki.preprocess(page,text,(err,processed,metadata) -> cb(err,text,metadata) )
			], (err,text,metadata) -> 
				# TODO: handle error
				if err then return next(err)

				editor = app.pages.getEditor(page)

				if not editor?.action? then return next(new Error('No editor found for this page type!')) 
				else
					return editor.action(text, metadata, req, res, next)

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
				(cb) -> store.read(page, {id: v1}, cb), 
				(cb) -> store.read(page, {id: v2}, cb)
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
							markup.html(text,{from: format},(err, html) -> cb(err,html,metadata))

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
					switch to
						when 'docx','pdf'
							markup.pipelineFile(text, {from: format, to: to, '--self-contained':true }, 
								[ wiki.replaceImagesWithLocals(store, to) ],
								(err, filename) ->
									console.log 
									if err then return next(err)
									res.download filename, "#{page}.#{to}", (err) ->
										if err then return next(err)
							)

						else
							markup.pipeline(text, {from: format, to: to, '--self-contained':true },
								[ wiki.replaceImagesWithLocals(store, to) ],
								(err, text) ->
									if err then return next(err)
									
									switch to
										when 'html','slidy','slideous','dzslides','s5'
											res.send text
										else
											res.attachment "#{page}.#{to}" 
											res.send text
							)

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

			store.create(page,text,author,message,(err, resource) ->
				if err then return next(err)
				res.redirect(wiki.url(page,'view'))
			)


		###*
		 * Route to remove a page
		 * @param  {Request} req Incoming HTTP request
		 * @param  {Response} res Outgoing HTTP response
		###
		remove: (req,res,next) ->
			store = app.get('store')
			page = wiki.filename req.sanitize(0).trim()

			message = req.param('message')
			author = new storejs.Author(req.user.name, req.user.email) # TODO

			console.log req.method
			switch req.method
				when 'GET' # confirm
						res.render('pages/remove.jade',{ page: page })					

				when 'POST' # perform delete
					store.remove page, author, message, (err) ->
						if err then return next(err)
						res.redirect(wiki.mainPage())
			
		move: (req,res,next) ->
			store = app.get('store')
			page = wiki.filename req.sanitize(0).trim()

			message = req.param('message')
			author = new storejs.Author(req.user.name, req.user.email) # TODO

			switch req.method
				when 'GET' # confirm
						res.render('pages/move.jade',{ page: page })

				when 'POST' # perform delete
					dest = wiki.filename req.sanitize('destination').trim()
					console.log req.sanitize('destination')
					console.log dest
					store.move page, dest, author, message, (err) ->
						if err then return next(err)
						res.redirect(wiki.url(dest,'view'))
			

		discuss:
			view: (req,res,next) ->

			editor: (req,res,next) ->

			edit: (req,res,next) ->