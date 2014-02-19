var util = require('util'),
	mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    passportLocalMongoose = require('passport-local-mongoose');


var AccountSchema = new Schema({
    name: String,
});
AccountSchema.plugin(passportLocalMongoose, {usernameField: 'email'});
Account = mongoose.model('Account',AccountSchema)

passport.use(Account.createStrategy());

passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// Connect mongoose
mongoose.connect('mongodb://localhost/jabberwiki');



// passport.use(new LocalStrategy(
//   function(username, password, done) {
//     if (username && password) {
//     	done(null, { email: username })
//     } else {
//     	done(null, false, 'Incorrect username or password')
//     }
//   }
// ));

// // authentication
// passport.serializeUser(function(user, done) {
//   done(null, user.email);
// });

// passport.deserializeUser(function(email, done) {
//   done(null, {email: email})
// });




module.exports.configure = function(app) {
	app.use(passport.initialize());
	app.use(passport.session());


	app.get('/register', function(req, res) {
        res.render('register', { });
    });

    app.post('/register', function(req, res) {
        Account.register(new Account({ name : req.body.name, email: req.body.email }), req.body.password, function(err, account) {
            if (err) {
                return res.render('register', { account : account });
            }

            res.redirect('/');
        });
    });

    app.get('/login', function(req, res) {
        res.render('login', { user : req.user });
    });

    app.post('/login', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login', failureFlash: false }), function(req, res) {
        res.redirect('/');
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });


    // configure routes
	// app.get('/login',function(req,res,next) {
	// 	res.render('login.jade')
	// })
	// app.post('/login',
	//   passport.authenticate('local', { successRedirect: '/',
	//                                    failureRedirect: '/login',
	//                                    failureFlash: true })
	// );
}


module.exports.auth = function auth(format) {
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