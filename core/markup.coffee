_ = require('underscore')
async = require('async')
wiki = require('wiki')
pth = require('path')
spawn = require('child_process').spawn


formats = {
	'pdf': [null, []]
}

getFormatOptions = (to, opt) ->
	if formats[to]
		opt.concat(formats[to][1])
		to = formats[to][0]
	[to, opt]


runPandoc = (src, args, callback) ->
	pandoc = spawn('pandoc', args);

	res = '';
	err = '';

	pandoc.stdout.on('data',(data) -> res += data; null )
	pandoc.stderr.on('data',(data) -> err += data; null )

	pandoc.on 'exit',(code) ->
		if code != 0 
			return callback(new Error('pandoc exited with code '+code+'. ' + (err || '') ));
		else if err 
			return callback(new Error(err));
		else
			callback(null, res)
			null

	pandoc.stdin.end(src, 'utf8');


pdc = (src, from, to, opt, cb) ->
	if not cb?
		cb = opt
		opt = null

	args = ['-f', from];
	[to, opt] = getFormatOptions(to,opt)

	if to? then args = args.concat(['-t', to])
	if opt? then args = args.concat(opt)

	runPandoc(src, args, cb)


pdcToFile = (src, from, to, out, opt, cb) ->
	if not cb?
		cb = opt
		opt = null

	args = ['-f', from];
	[to, opt] = getFormatOptions(to,opt)

	if to? then args = args.concat(['-t', to])
	if out? then args = args.concat(['-o', out])
	if opt? then args = args.concat(opt)

	runPandoc(src, args, cb)



pipeline = (text, from, to, options, middleware, callback) ->
	
	pre = (cb) -> 
		pdc text,from,'json',options,(err, tree) ->
			if err 
				cb(err) 
			else 
				try 
					cb(null,JSON.parse(tree))
				catch e  
					cb(e)

	post = (tree,cb) -> 
		finalText = JSON.stringify(tree)
		pdc finalText,'json',to,options,cb

	chain = ([ pre ]).concat(middleware).concat([ post ]);
	async.waterfall chain, callback

module.exports = me =

	###*
	 * Runs a pipeline of middleware to process JSON trees from Pandoc
	 * @param  {String} text Input text
	 * @param  {String} from Format to use when parsing the input text
	 * @param  {String} to Final format in which the output should be provided
	 * @param  {Array} options Array of options to be passed to Pandoc
	 * 
	 * @param  {Function[]} middleware 
	 * Array of functions to be called between the input and output.
	 * Each function will be passed two arguments:
	 * 
	 *     - `currentTree`: a JSON array containing the current Pandoc document tree, 
	 *        as modified by previous middleware
	 *     - `next(err, finalTree)`: a callback to be called upon completion of the present middleware
	 * 
	 * Each middleware function should modify the passed `currentTree` as suitable, then call `next` 
	 * with either an `Error` or the modified tree. This modified tree will be passed to subsequent 
	 * middleware, and so forth.
	 *
	 * @param  {Function} callback Callback to be executed upon completion
	 * @param {Error} callback.err Error if one occurs
	 * @param {String} callback.output Output text
	 ###
	pipeline: (text, from, to, options, middleware, callback) ->
		pipeline(text, from, to, options, middleware, pdc, callback)

	pipelineFile: (text, from, to, options, middleware, callback) ->
		pipeline(text, from, to, options, middleware, me.convertFile, callback)

	convert: (text, from, to, options=[], callback) ->
		pdc(text, from, to, options, callback)
		# callback(text)
	
	convertFile: (text, from, to, options, callback) ->
		wiki.tempFile (err,outputFile) -> 
			if err then return callback(err)

			pdcToFile text, from, to, outputFile, options, (err, data) -> 
				callback(err, outputFile)

	html: (text, from, options=[], callback) ->
		options = options.concat ['--table-of-contents','--base-header-level=2','--mathjax']
		# TODO: Include a template so Pandoc will render the TOC
		me.pipeline(text, from, 'html', options, 
			[ ( (tree, cb) -> cb(wiki.replaceWikiLinks(tree)) ), 
			(tree, cb) -> console.log(tree); cb(tree) ], callback)

		pdc(text, from, 'html', options, callback)

	
	
	# Metadata: class Metadata

	# 	constructor: (config) ->
	# 		_.apply(this,config)