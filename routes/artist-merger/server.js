var express = require('express');
var router = express.Router();
var SpotifyWebApi = require('spotify-web-api-node');
var spotifyLoginTools = require('../../public/javascripts/spotify-login-tools');

/* Artist Merger Authorization Flow */


/* Create Authorize URL and forward to Spotify Login Page */
router.get('/login', function(req, res) {
    const scope = ['playlist-read-private', 'playlist-modify-private']
    spotifyLoginTools.login(spotifyApi, scope, res);
});

/* Fetch Response code from Spotify and generate initial token pair*/
router.get('/callback', function(req, res){
    const frontendURL = 'http://localhost:4200/login/callback';
    spotifyLoginTools.callback(spotifyApi, frontendURL, req, res);
});

module.exports = router;

const spotifyApi = new SpotifyWebApi({
    clientId: '8c08a50634a84a1f8786e261409f71e4',
    clientSecret: '',
    redirectUri: 'http://localhost:3000/artist-merger/api/callback'
});

