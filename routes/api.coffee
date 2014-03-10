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



