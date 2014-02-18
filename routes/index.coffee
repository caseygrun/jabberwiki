wiki = require('wiki')

module.exports = (app) ->
	index: (req,res) ->
		console.log('redirecting from / to /pages/main/view')
		res.redirect(wiki.mainPage())
	page: require('./page')(app)
	special: require('./special')(app)
	categories: require('./categories')(app)
	api: require('./api')(app)


