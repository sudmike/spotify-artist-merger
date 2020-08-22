var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var SpotifyWebApi = require('spotify-web-api-node')

//Router definitions
var indexRouter = require('./routes/index');
var loginRouter = require('./routes/login');
var overviewRouter = require('./routes/overview')
var templateRouter = require('./routes/template')
var errorRouter = require('./routes/error')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'vash');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//Connect Router to URL
app.use('/', indexRouter);
app.use('/login', loginRouter)
app.use('/overview', overviewRouter)
app.use('/template', templateRouter)
app.use('/error', errorRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


var spotifyApi = new SpotifyWebApi({
  clientId: '8c08a50634a84a1f8786e261409f71e4',
  clientSecret: '2de26183851540a69c4cff90d2761ee0',
  redirectUri: 'http://localhost:3000/login/callback'
});

global.spotify = { spotifyApi: spotifyApi };
//Disgusting

module.exports = app;
