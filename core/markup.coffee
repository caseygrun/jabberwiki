_ = require('underscore')
async = require('async')
wiki = require('wiki')
pth = require('path')
spawn = require('child_process').spawn
dockers = require('dockers')

formats = {
	'pdf': [null, []]
}

getFormatOptions = (to, opt) ->
	if formats[to]
		opt.concat(formats[to][1])
		to = formats[to][0]
	[to, opt]

# ###*
#  * Invokes Pandoc with the given source text and array of command-line options
#  * @param  {String} src Input text
#  * @param  {String[]} args Command line options
#  * @param  {Function} callback Callback to be executed upon completion
#  * @param  {Error} callback.err Error if one occurs
#  * @param  {String} callback.result Output text
# ###
# runPandoc = (src, args, callback) ->
# 	# console.log 'runpandoc:'
# 	# console.log arguments;
# 	# console.trace()

# 	do (src, args, callback) -> 
# 		pandoc = spawn('pandoc', args);

# 		res = '';
# 		err = '';

# 		pandoc.stdout.setEncoding('utf8');
# 		pandoc.stderr.setEncoding('utf8');
# 		pandoc.stdout.on('data',(data) -> res += data; null )
# 		pandoc.stderr.on('data',(data) -> err += data; null )

# 		pandoc.on 'close',(code) ->
# 			if code != 0 
# 				return callback(new Error('pandoc exited with code '+code+'. ' + (err || '') ));
# 			else if err 
# 				return callback(new Error(err));
# 			else
# 				callback(null, res)
# 				null

# 		pandoc.stdout.resume();
# 		pandoc.stderr.resume();

# 		pandoc.stdin.end(src, 'utf8');

# ###*
#  * Invokes pandoc to convert the input text `src` from one format to another, with optional arguments `opt`
#  * @param  {String} src Input text
#  * @param  {String} from Input format (e.g. `markdown`, `html`, etc. )
#  * @param  {String} to Output format (e.g. `markdown`, `html`, `latex`, etc.)
#  * @param  {String[]} opt Array of command line options to be passed to Pandoc
#  * @param  {Function} callback Callback to be executed upon completion
#  * @param  {Error} callback.err Error if one occurs
#  * @param  {String} callback.result Output text
# ###
# pdc = (src, from, to, opt, cb) ->
# 	if not cb?
# 		cb = opt
# 		opt = null

# 	args = ['-f', from];
# 	[to, opt] = getFormatOptions(to,opt)

# 	if to? then args = args.concat(['-t', to])
# 	if opt? then args = args.concat(opt)

# 	runPandoc(src, args, cb)


# pdcToFile = (src, from, to, out, opt, cb) ->
# 	if not cb?
# 		cb = opt
# 		opt = null

# 	args = ['-f', from];
# 	[to, opt] = getFormatOptions(to,opt)

# 	if to? then args = args.concat(['-t', to])
# 	if out? then args = args.concat(['-o', out])
# 	if opt? then args = args.concat(opt)

# 	runPandoc(src, args, cb)


# ###*
#  * Runs a pipeline of middleware to process JSON trees from Pandoc
#  * @param  {String} text Input text
#  * @param  {String} from Format to use when parsing the input text
#  * @param  {String} to Final format in which the output should be provided
#  * @param  {Array} options Array of options to be passed to Pandoc
#  * 
#  * @param  {Function[]} middleware 
#  * Array of functions to be called between the input and output.
#  * Each function will be passed two arguments:
#  * 
#  *     - `currentTree`: a JSON array containing the current Pandoc document tree, 
#  *        as modified by previous middleware
#  *     - `next(err, finalTree)`: a callback to be called upon completion of the present middleware
#  * 
#  * Each middleware function should modify the passed `currentTree` as suitable, then call `next` 
#  * with either an `Error` or the modified tree. This modified tree will be passed to subsequent 
#  * middleware, and so forth.
#  *
#  * @param  {Function} callback Callback to be executed upon completion
#  * @param {Error} callback.err Error if one occurs
#  * @param {String} callback.output Output text
#  ###
# pipeline = (text, from, to, options, middleware, callback) ->
	
# 	pre = (cb) -> 
# 		pdc text,from,'json',options,(err, tree) ->
# 			if err 
# 				cb(err) 
# 			else 
# 				try 
# 					console.log 'tree from pandoc:'
# 					console.log tree
# 					t = JSON.parse(tree);
# 				catch e  
# 					return cb(e)
# 				cb(null,t);

# 	post = (tree,cb) -> 
# 		finalText = JSON.stringify(tree)
# 		pdc finalText,'json',to,options,cb

# 	chain = ([ pre ]).concat(middleware).concat([ post ]);

# 	async.waterfall chain, callback

module.exports = me =

	# pipeline: (text, from, to, options, middleware, callback) ->
	# 	pipeline(text, from, to, options, middleware, callback)

	# pipelineFile: (text, from, to, options, middleware, callback) ->
	# 	# pipeline(text, from, to, options, middleware, me.convertFile, callback)

	# convert: (text, from, to, options=[], callback) ->
	# 	pdc(text, from, to, options, callback)
	# 	# callback(text)
	
	# convertFile: (text, from, to, options, callback) ->
	# 	wiki.tempFile (err,outputFile) -> 
	# 		if err then return callback(err)

	# 		pdcToFile text, from, to, outputFile, options, (err, data) -> 
	# 			callback(err, outputFile)
	
	pipeline: (text, from, to, options, middleware, callback) ->
		dockers.pipeline(text, from, to, options, middleware, callback)

	pipelineFile: (text, from, to, options, middleware, callback) ->
		# pipeline(text, from, to, options, middleware, me.convertFile, callback)

	convert: (text, from, to, options=[], callback) ->
		dockers.convert(text, from, to, options, callback)
		# callback(text)
	
	convertFile: (text, from, to, options, callback) ->
		dockers.convertFile(text,from,to,options,callback)


	###*
	 * Converts input `text` from a source format to HTML after performing wiki-link replacement
	 * @param  {String} text Input text
	 * @param  {String} from Input format (e.g. `markdown`, `html`, `latex`, etc.)
	 * @param  {String[]} [options=[]] Array of command line arguments
	 * @param  {Function} callback Callback to be executed upon completion
	 * @param  {Error} callback.err Error if one occurs
	 * @param  {String} callback.result Output text
	###
	html: (text, from, options=[], callback) ->
		options = options.concat ['--table-of-contents','--base-header-level=2','--mathjax']
		
		# TODO: Include a template so Pandoc will render the TOC
		me.pipeline(text, from, 'html', options, 
			[ ( (tree, cb) -> cb(null,wiki.replaceWikiLinks(tree)) ) ], callback)

		
	
	
	# Metadata: class Metadata

	# 	constructor: (config) ->
	# 		_.apply(this,config)