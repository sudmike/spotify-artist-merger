var SpotifyWebApi = require('spotify-web-api-node');


var login = function(spotify, scope, res){ // spotify: SpotifyWebApi, scope: string[], res: Response
    console.log('Spotify Login Request from Angular');

    // create and set auth cookie
    const authState = generateRandomString(16);
    res.cookie('spotify_auth_state', authState);

    // redirect to spotify
    res.redirect(spotify.createAuthorizeURL(scope, authState, false));
}

var callback = function(spotify, callbackURL, req, res){ //spotify: SpotifyWebApi, req: Request, res: Response
    console.log('Callback from Spotify received')

    if(req.query.state !== req.cookies['spotify_auth_state']) { //check state between spotify and cookie
        /* State Mismatch Error redirect */
        console.log(req.query.state, ' differs from ', req.cookies['spotify_auth_state']);
        const url = callbackURL + '?error=' + 'spotify_state_differs_from_cookie_state';
        res.redirect(url);
    }

    else if(req.query.code){ // check that code exists
        res.clearCookie('spotify_auth_state') // clear auth state cookie

        spotify.authorizationCodeGrant(req.query.code).
        then(data => {
                // Set the access token on the Serverside API object
                spotify.setAccessToken(data.body['access_token']);
                spotify.setRefreshToken(data.body['refresh_token']);

                const url = callbackURL + '?accessToken=' + data.body['access_token'];

                console.log('URL:', url);

                res.redirect(url);
            })
            .catch(err => {
                /* Authorization Grant Error redirect */
                console.log(err);
                const url = callbackURL + '?error=' + err.prototype.message;
                res.redirect(url);
            })
    }
    else {
        console.log();
        const url = callbackURL + '?error' + 'no_authorization_code_from_spotify';
        res.redirect(url);
    }
}

// useful for creation of authorization state
var generateRandomString = function(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

module.exports = { login, callback }

