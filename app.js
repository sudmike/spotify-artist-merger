var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var SpotifyWebApi = require('spotify-web-api-node');

var indexRouter = require('./routes/index');
var serverRouter = require('./routes/server');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/api', serverRouter);

module.exports = app;



var spotifyApi = new SpotifyWebApi({
    clientId: '8c08a50634a84a1f8786e261409f71e4',
    clientSecret: '',
    redirectUri: 'http://localhost:3000/api/callback'
});

global.spotify = { spotifyApi: spotifyApi };
