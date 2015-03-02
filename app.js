/**
# Module dependencies.
*/


(function() {
  var LocalStrategy, app, auth, authentication, bunyan, config, express, expressValidator, http, markup, moment, pages, passport, path, revisionary, routes, wiki, _;

  http = require('http');

  path = require('path');

  express = require('express');

  _ = require('underscore');

  moment = require('moment');

  passport = require('passport');

  LocalStrategy = require('passport-local').Strategy;

  bunyan = require('bunyan');

  expressValidator = require('express-validator');

  pages = require('./core/page');

  routes = require('./routes');

  config = require('./config/config');

  revisionary = require('revisionary');

  wiki = require('wiki');

  markup = require('markup');

  authentication = require('./core/auth');

  app = express();

  app.set('port', process.env.PORT || 3000);

  app.set('views', __dirname + '/views');

  app.set('view engine', 'jade');

  app.set('log', bunyan.createLogger({
    name: 'wiki',
    streams: [
      {
        path: 'app.log'
      }, {
        stream: process.stderr,
        level: 'info'
      }
    ]
  }));

  app.locals({
    _: _,
    wiki: wiki,
    markup: markup,
    moment: moment
  });

  app.use(express.favicon());

  app.use(express.logger('dev'));

  app.use(express["static"](path.join(__dirname, 'public')));

  app.use(express.bodyParser());

  app.use(expressValidator());

  app.use(express.methodOverride());

  app.use(express.cookieParser('your secret here'));

  app.use(express.session());

  authentication.configure(app);

  app.use(app.router);

  app.use(require('less-middleware')({
    src: __dirname + '/public'
  }));

  app.use(function(err, req, res, next) {
    app.get('log').error(err);
    res.render('error.jade', err);
  });

  if ('development' === app.get('env')) {
    app.use(express.errorHandler());
  }

  auth = authentication.auth;

  app.set('store', (function() {
    var StoreClass, appStore, engine, _ref;
    StoreClass = void 0;
    engine = config.store.engine;
    appStore = void 0;
    appStore = revisionary.Store.create((_ref = config.engine) != null ? _ref : 'git', config.store.path);
    if (!appStore) {
      console.log('Failed to create store for application with engine \'' + engine + '\'. Check config.json.');
      throw new Error;
    }
    appStore.detect(function(err, valid) {
      if (err) {
        console.log(err);
        throw err;
      }
      if (!valid) {
        appStore.initialize(null, function(err) {
          if (err) {
            console.log(err);
            throw err;
          }
        });
      }
    });
    return appStore;
  })());

  app.pages = pages;

  routes = routes(app);

  pages.init(app, {
    middleware: [auth('html')],
    tools: [
      {
        route: '/pages/[page]/view',
        action: routes.page.view
      }, {
        route: '/pages/[page]/diff/{v1}/{v2}',
        action: routes.page.diff
      }, {
        route: '/pages/[page]/edit',
        action: routes.page.editor
      }, {
        route: '/pages/[page]/edit',
        action: routes.page.edit,
        method: 'post'
      }, {
        route: '/pages/[page]/remove',
        action: routes.page.remove
      }, {
        route: '/pages/[page]/remove',
        action: routes.page.remove,
        method: 'post'
      }, {
        route: '/pages/[page]/move',
        action: routes.page.move
      }, {
        route: '/pages/[page]/move',
        action: routes.page.move,
        method: 'post'
      }, {
        route: '/pages/[page]/log',
        action: routes.page.log
      }, {
        route: '/pages/[page]/print',
        action: routes.page.print
      }, {
        route: '/pages/[page]/export/{format}',
        action: routes.page["export"]
      }, {
        route: '/pages/[page]/raw',
        action: routes.page.raw
      }, {
        route: '/files/[page]',
        action: routes.page.raw
      }
    ],
    views: [
      {
        filter: '*.{jpg,png,gif,tiff}',
        action: routes.page.views['image']
      }, {
        filter: '*',
        action: routes.page.views['default']
      }
    ],
    editors: [
      {
        filter: '*',
        action: routes.page.editors['default']
      }
    ]
  });

  app.get('/', routes.index);

  app.get('/categories', auth('html'), routes.categories.list);

  app.get(/^\/categories\/([\w\.\/ ]+)/, auth('html'), routes.categories.view);

  app.get('/upload', auth('html'), routes.special.uploader);

  app.post('/upload', auth('html'), routes.special.upload);

  app.get('/recent', auth('html'), routes.special.recent);

  app.get('/all', auth('html'), routes.special.all);

  app.post('/go', auth('html'), routes.special.go);

  app.post('/search', auth('html'), routes.special.search);

  app.get('/api/search', auth('json'), routes.api.search);

  app.get('/api/all', auth('json'), routes.api.all);

  app.get('/api/index', auth('json'), routes.api.index);

  app.post('/api/preview', auth('json'), routes.api.preview);

  app.post('/api/upload', auth('json'), routes.api.upload);

  http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
  });

}).call(this);
