fs = require('fs')
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

		recent: (req, res, next) ->
			store = app.get('store')

			store.log '', (err, revisions) ->
				if err then return next(err)
				res.send(revisions)				


		upload: (req,res,next) ->
			if req.files?.upload?.path? 
				file = req.files.upload
				store = app.get('store')
				author = new storejs.Author('Name', 'example@example.com') # TODO
				message = "Uploaded file: #{file.name}"

				fs.readFile file.path,(err, data) ->
					if err then return next(err)
					
					store.create file.name, data, author, message, (err, resource) ->
						if err then return next(err)
						res.send('ok')
			else
				console.log req.files
				next new Error()



