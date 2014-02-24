
/**
 * Module dependencies.
 */

var express = require('express')
  , pages = require('./core/page')
  , routes = require('./routes')
  , config = require('./config/config')

  , expressValidator = require('express-validator')
  , bunyan = require('bunyan')
  , _ = require('underscore')
  , moment = require('moment')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy


  , store = require('revisionary')
  , wiki = require('wiki')
  , markup = require('markup')
  , authentication = require('./core/auth')

  , http = require('http')
  , path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.set('log',bunyan.createLogger({name: "wiki", streams: [{
        path: 'app.log',
    },{
    	stream: process.stderr,
    	level: 'info'
    }]
}))

// view helpers
app.locals({
	_ : _,
	wiki: wiki,
	markup: markup,
	moment: moment,
})


// middleware
app.use(express.favicon());
app.use(express.logger('dev'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.bodyParser());
app.use(expressValidator());

app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());

authentication.configure(app)

app.use(app.router);
app.use(require('less-middleware')({ src: __dirname + '/public' }));


// normal error-handling middleware
app.use(function(err, req, res, next) {
	app.get('log').error(err);
	res.render('error.jade', err)
})

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


auth = authentication.auth

// set up repository
app.set('store', (function() {
	var StoreClass, engine = config.store.engine, appStore;
	
	switch(engine) {
		case 'git':
		default:
			StoreClass = store.GitStore;
	}

	// Create new store for the app
	appStore = new StoreClass(config.store.path);


	if(!appStore) {
		// TODO: handle error
		console.log("Failed to create store for application with engine '"+engine+"'. Check config.json.")
		throw new Error();
	}

	// If the appStore was created successfully, detect whether the 
	// repository needs to be initialized and if so, do so.
	appStore.detect(function(err,valid) {
		if(err) {
			// TODO: handle error
			console.log(err)
			throw err;
		}
		if(!valid) {
			appStore.initialize(null, function(err) {
				if(err) {
					// TODO: handle error
					console.log(err)
					throw err;
				}

			})
		}
	})
	
	return appStore;
})() )


app.pages = pages

routes = routes(app)

pages.init(app,{
	middleware: [auth('html')],
	tools: [{
		route: '/pages/[page]/view',
		action: routes.page.view
	},{
		route: '/pages/[page]/diff/{v1}/{v2}',
		action: routes.page.diff
	},{
		route: '/pages/[page]/edit',
		action: routes.page.editor
	},{
		route: '/pages/[page]/edit',
		action: routes.page.edit,
		method: 'post'
	},{
		route: '/pages/[page]/log',
		action: routes.page.log
	},{
		route: '/pages/[page]/print',
		action: routes.page.print
	},{
		route: '/pages/[page]/export/{format}',
		action: routes.page.export
	},{
		route: '/pages/[page]/raw',
		action: routes.page.raw
	},{
		route: '/files/[page]',
		action: routes.page.raw
	}],

	views: [{
		filter: '*.{jpg,png,gif,tiff}',
		action: routes.page.views['image']
	},{
		filter: '*',
		action: routes.page.views['default']
	}],

	editors: [{
		filter: '*',
		action: routes.page.editors['default']
	}]

})

app.get('/', routes.index);


// app.get(/^\/pages\/([\w\.\/%\(\)\{\}\[\] ]+)\/view$/, auth('html'), routes.page.view);
// app.get(/^\/pages\/([\w\.\/%\(\)\{\}\[\] ]+)\/view\/([\w]+)$/, auth('html'), routes.page.view);
// app.get(/^\/pages\/([\w\.\/%\(\)\{\}\[\] ]+)\/diff\/([\w]+)\/([\w]+)$/, auth('html'), routes.page.diff);


// app.get(/^\/pages\/([\w\.\/%\(\)\{\}\[\] ]+)\/edit$/, auth('html'), routes.page.editor);
// app.get(/^\/pages\/([\w\.\/%\(\)\{\}\[\] ]+)\/log$/, auth('html'), routes.page.log);
// app.get(/^\/pages\/([\w\.\/%\(\)\{\}\[\] ]+)\/print$/, auth('html'), routes.page.print);
// app.get(/^\/pages\/([\w\.\/%\(\)\{\}\[\] ]+)\/export\/([\w\. ]+)$/, auth('html'), routes.page.export);
// app.get(/^\/pages\/([\w\.\/%\(\)\{\}\[\] ]+)\/raw$/, auth('html'), routes.page.raw);
// app.get(/^\/files\/([\w\.\/%\(\)\{\}\[\] ]+)\/?/, auth('html'), routes.page.raw);



// app.post(/^\/pages\/([\w\.\/%\(\)\{\}\[\] ]+)\/edit$/, auth('html'), routes.page.edit);
// app.post(/^\/pages\/([\w\.\/%\(\)\{\}\[\] ]+)\/remove$/, auth('html'), routes.page.remove);
// app.post(/^\/pages\/([\w\.\/%\(\)\{\}\[\] ]+)\/move$/, auth('html'), routes.page.move);

// app.get(/^\/pages\/([\w\.\/%\(\)\{\}\[\] ]+)\/discuss$/, auth('html'), routes.page.discuss.view);
// app.get(/^\/pages\/([\w\.\/%\(\)\{\}\[\] ]+)\/discuss\/edit$/, auth('html'), routes.page.discuss.editor);
// app.post(/^\/pages\/([\w\.\/%\(\)\{\}\[\] ]+)\/discuss\/edit$/, auth('html'), routes.page.discuss.edit);

app.get('/categories', auth('html'), routes.categories.list)
app.get(/^\/categories\/([\w\.\/ ]+)/, auth('html'), routes.categories.view)

app.get('/upload', auth('html'),routes.special.uploader)
app.post('/upload', auth('html'),routes.special.upload)


app.get('/recent', auth('html'), routes.special.recent)
app.get('/all', auth('html'), routes.special.all)
app.post('/go', auth('html'), routes.special.go)
app.post('/search', auth('html'), routes.special.search)

app.get('/api/search',auth('json'), routes.api.search)
app.get('/api/all',auth('json'), routes.api.all)
app.get('/api/index',auth('json'), routes.api.index)

app.post('/api/preview',auth('json'), routes.api.preview)
app.post('/api/upload',auth('json'), routes.api.upload)


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
