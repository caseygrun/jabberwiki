
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , config = require('./config/config')

  , expressValidator = require('express-validator')
  , bunyan = require('bunyan')
  , _ = require('underscore')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy


  , store = require('revisionary')
  , wiki = require('wiki')
  , markup = require('markup')

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
	markup: markup
})

// authentication
passport.use(new LocalStrategy(
  function(username, password, done) {
    if (username && password) {
    	done(null, { email: username })
    } else {
    	done(null, false, 'Incorrect username or password')
    }
  }
));


app.use(express.favicon());
app.use(express.logger('dev'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.bodyParser());
app.use(expressValidator());

app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(passport.initialize());
app.use(passport.session());

app.use(app.router);
app.use(require('less-middleware')({ src: __dirname + '/public' }));


// normal error-handling middleware
app.use(function(err, req, res, next) {
	app.get('log').error(err);
	res.render('error.jade')
})

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// authentication
passport.serializeUser(function(user, done) {
  done(null, user.email);
});

passport.deserializeUser(function(email, done) {
  done(null, {email: email})
});

function auth(format) {
	format || (format = 'html')
	switch(format) {
		case 'html':
		default:
			return function(req,res,next) {
				if (req.isAuthenticated()) { res.locals.user = req.user; return next(); }
		  		res.redirect('/login')
			} 
	}
}

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

routes = routes(app)

// configure routes
app.get('/login',function(req,res,next) {
	res.render('login.jade')
})
app.post('/login',
  passport.authenticate('local', { successRedirect: '/',
                                   failureRedirect: '/login',
                                   failureFlash: true })
);


app.get('/', routes.index);

app.get(/^\/pages\/([\w\.\/% ]+)\/view$/, auth('html'), routes.page.view);
app.get(/^\/pages\/([\w\.\/% ]+)\/view\/([\w]+)$/, auth('html'), routes.page.view);
app.get(/^\/pages\/([\w\.\/% ]+)\/diff\/([\w]+)\/([\w]+)$/, auth('html'), routes.page.diff);


app.get(/^\/pages\/([\w\.\/% ]+)\/edit$/, auth('html'), routes.page.editor);
app.get(/^\/pages\/([\w\.\/% ]+)\/log$/, auth('html'), routes.page.log);
app.get(/^\/pages\/([\w\.\/% ]+)\/print$/, auth('html'), routes.page.print);
app.get(/^\/pages\/([\w\.\/% ]+)\/export\/([\w\. ]+)$/, auth('html'), routes.page.export);
app.get(/^\/pages\/([\w\.\/% ]+)\/raw$/, auth('html'), routes.page.raw);
app.get(/^\/files\/([\w\.\/% ]+)\/?/, auth('html'), routes.page.raw);



app.post(/^\/pages\/([\w\.\/% ]+)\/edit$/, auth('html'), routes.page.edit);
app.post(/^\/pages\/([\w\.\/% ]+)\/remove$/, auth('html'), routes.page.remove);
app.post(/^\/pages\/([\w\.\/% ]+)\/move$/, auth('html'), routes.page.move);

app.get(/^\/pages\/([\w\.\/% ]+)\/discuss$/, auth('html'), routes.page.discuss.view);
app.get(/^\/pages\/([\w\.\/% ]+)\/discuss\/edit$/, auth('html'), routes.page.discuss.editor);
app.post(/^\/pages\/([\w\.\/% ]+)\/discuss\/edit$/, auth('html'), routes.page.discuss.edit);

app.get('/categories', auth('html'), routes.categories.list)
app.get(/^\/categories\/([\w\.\/ ]+)/, auth('html'), routes.categories.view)

app.get('/upload', auth('html'),routes.special.uploader)
app.post('/upload', auth('html'),routes.special.upload)


app.get('/recent', auth('html'), routes.special.recent)
app.get('/all', auth('html'), routes.special.all)
app.post('/go', auth('html'), routes.special.go)
app.post('/search', auth('html'), routes.special.search)



http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
