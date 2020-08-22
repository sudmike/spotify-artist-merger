var express = require('express');
var router = express.Router();

/* Redirect to Spotify's Login Page. */
router.get('/', function(req, res, next) {
    res.redirect(spotify.spotifyApi.createAuthorizeURL(['playlist-read-private', 'playlist-modify-private']/*Session Management in progress*/))
});


/* Fetch Response code from Spotify and generate initial token pair*/
router.get('/callback', function(req, res){

    //Use Authorization Code to generate initial token pair
    spotify.spotifyApi.authorizationCodeGrant(req.query.code).then(
        function(data) {
            // Set the access token on the API object to use it in later calls
            spotify.spotifyApi.setAccessToken(data.body['access_token']);
            spotify.spotifyApi.setRefreshToken(data.body['refresh_token']);

            res.redirect('/overview')
        },
        function(err){
            // Redirect to Error Page and return status
            console.log('Something went wrong!', err)
            console.log('Status Code: ', err.statusCode)

            //res.redirect(err.statusCode, '/error') //Error Handling in progress
        })
})



module.exports = router;
