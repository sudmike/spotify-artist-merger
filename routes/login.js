var express = require('express');
var router = express.Router();
var createError = require('http-errors');


/* Redirect to Spotify's Login Page. */
router.get('/', function(req, res, next) {
    //set State Cookie which will be passed as argument to Spotify's API
    var authState = generateRandomString(16)
    res.cookie('spotify_auth_state', authState)
    res.redirect(spotify.spotifyApi.createAuthorizeURL(['playlist-read-private', 'playlist-modify-private'], authState, false))
});


/* Fetch Response code from Spotify and generate initial token pair*/
router.get('/callback', function(req, res, next){

    if(req.query.state !== req.cookies['spotify_auth_state']) {
        //state_mismatch error redirect
        next(createError(401,'state_mismatch error'))
    }
    else { //matching state between Spotify and Cookie
        //clear State Cookie
        res.clearCookie('spotify_auth_state')

        //Use Authorization Code to generate initial token pair
        spotify.spotifyApi.authorizationCodeGrant(req.query.code).then(
            function(data) {
                // Set the access token on the API object to use it in later calls
                spotify.spotifyApi.setAccessToken(data.body['access_token']);
                spotify.spotifyApi.setRefreshToken(data.body['refresh_token']);

                res.redirect('/overview')
            },
            function(err){
                //authorization_grant error redirect
                next(createError(err.statusCode, 'authorization_grant error'))
            })
    }
})


var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};


module.exports = router;
