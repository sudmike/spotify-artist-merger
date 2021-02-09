var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var SpotifyWebApi = require('spotify-web-api-node');
var cors = require('cors');


var indexRouter = require('./routes/index');
var artistMergerServerRouter = require('./routes/artist-merger/server');
var hueServerRouter = require('./routes/hue/server');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
    origin: 'http://localhost:4200'
}))

app.use('/', indexRouter);
app.use('/artist-merger/api', artistMergerServerRouter);
app.use('/hue/api', hueServerRouter);

module.exports = app;

