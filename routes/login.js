var express = require('express');
var router = express.Router();

/* Redirect to Spotify's Login Page. */
router.get('/', function(req, res, next) {
    //set State Cookie which will be passed as argument to Spotify's API
    var authState = generateRandomString(16)
    res.cookie('spotify_auth_state', authState)
    res.redirect(spotify.spotifyApi.createAuthorizeURL(['playlist-read-private', 'playlist-modify-private'], authState, false))
});


/* Fetch Response code from Spotify and generate initial token pair*/
router.get('/callback', function(req, res){

    if(req.query.state !== req.cookies['spotify_auth_state']) {
        /*Error Handling*/
        //state_mismatch error redirect
        console.log('state_mismatch Error')
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
                /*Error Handling*/
                //authorization_grant error redirect
                console.log('authorization_grant Error', err)
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
