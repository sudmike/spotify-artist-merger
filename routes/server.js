var express = require('express');
var router = express.Router();

//router.get('/', function(req, res, next) {
//    res.render('index', { title: 'Express' });
//});

/* Create Authorize URL and forward to Spotify Login Page */
router.get('/login', function(req, res, next) {
    //set State Cookie which will be passed as argument to Spotify's API
    var authState = generateRandomString(16)
    res.cookie('spotify_auth_state', authState)
    res.redirect(spotify.spotifyApi.createAuthorizeURL(['playlist-read-private', 'playlist-modify-private'], authState))
});

/* Fetch Response code from Spotify and generate initial token pair*/
router.get('/callback', function(req, res, next){
    if(req.query.state !== req.cookies['spotify_auth_state']) {
        /*State Mismatch Error redirect*/
    }
    else { //matching state between Spotify and Cookie
        //clear State Cookie
        res.clearCookie('spotify_auth_state')

        //Use Authorization Code to generate initial token pair
        spotify.spotifyApi.authorizationCodeGrant(req.query.code).then(
            function(data) {
                // Set the access token on the Serverside API object
                spotify.spotifyApi.setAccessToken(data.body['access_token']);
                spotify.spotifyApi.setRefreshToken(data.body['refresh_token']);

                var url = 'http://localhost:4200/login/callback' + '?accessToken=' + data.body['access_token']
                res.redirect(url);

            },
            function(err){
                /*Authorization Grant Error redirect*/
            })
    }
});

module.exports = router;


var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};
