var express = require('express');
var router = express.Router();
var axios = require('axios');
var SpotifyWebApi = require('spotify-web-api-node');
var v3 = require('node-hue-api').v3;
var Api = require('node-hue-api');
var spotifyLoginTools = require('../../public/javascripts/spotify-login-tools');
var hueTools = require('../../public/javascripts/hue-tools');
var vibrantTools = require('../../public/javascripts/vibrant-tools');
var databaseTools = require('../../public/javascripts/database-tools');

/* Hue Authorization Flow */

/** Create Authorize URL and forward to Spotify Login Page */
router.get('/spotify-login', function(req, res) {
    const scope = ['user-read-playback-state']
    spotifyLoginTools.login(spotifyApi, scope, res);
});

/** Fetch Response code from Spotify and generate initial token pair*/
router.get('/spotify-callback', function(req, res){
    const frontendURL = 'http://localhost:4200/login/callback';
    spotifyLoginTools.callback(spotifyApi, frontendURL, req, res);
});

/** Get new Access Token from Spotify */
router.get('/spotify-refresh', function(req, res){
    if(spotifyApi.getRefreshToken() !== undefined){
        spotifyApi.refreshAccessToken()
            .then(data => {
                if(data.statusCode === 200){
                    console.log(spotifyApi.getCredentials())
                    spotifyApi.setAccessToken(data.body.access_token);
                    console.log(spotifyApi.getCredentials())
                    res.send({
                        status: 'success',
                        data: {
                            accessToken: data.body.access_token,
                        }
                    });
                }
                else {
                    console.log(data.body.error_description);
                    return Promise.reject;
                }
            })
            .catch(err => {
                res.send({
                    status: 'error',
                    message: 'Could not refresh Access Token!'
                });
            });
    }
    else {
        res.send({
            status: 'error',
            message: 'Could not refresh Access Token because no refresh token has been set!'
        });
    }
});

router.get('/hue-login', function(req, res){
    hueTools.login(remoteBootstrap, hueApiCredentials, res);
});

router.get('/hue-callback', function(req, res){

    const frontendURL = 'http://localhost:4200/login/callback';
    hueTools.callback(remoteBootstrap, /*frontendURL,*/ req, res)
        .then(data => {
            console.log('Chceckcheck', data)

            if(!data.api){
                const url = frontendURL + '?error=' + 'Could not create hue api!';
                res.redirect(url);
            }
            else if(!data.credentials){
                const url = frontendURL + '?error=' + 'Could not find all hue credentials!';
                res.redirect(url);
            }
            else{
                const freshSesh = hueTools.generateRandomString(8); //... random string (8 characters letters)
                console.log('fresh session ID: ' ,freshSesh);
                hueApis.set(freshSesh, data.api);

                databaseTools.postDatabaseEntry(
                    freshSesh,
                    data.credentials.username,
                    data.credentials.accessToken,
                    data.credentials.accessTokenExpiration,
                    data.credentials.refreshToken,
                    data.credentials.refreshTokenExpiration
                )
                    .then(() => { // successfully written to db
                        res.redirect(
                            frontendURL +
                            '?accessToken=' + data.credentials.accessToken +
                            '?session=' + freshSesh
                        );
                    })
                    .catch(err => {
                        const url = frontendURL + '?error=' + err.message;
                        res.redirect(url);
                    });

            }

        })
        .catch(err => {
            const url = frontendURL + '?error=' + err.message
            res.redirect(url);
        })
});

router.get('/hue-login/debug', function(req, res){
    const username = '2a6jOWr-kcqeO13ePDwp6K4yF-RZdxAa9aZ8A0ff';
    const access = 'PKAwQgCPfYX7XWKOh0dKrX80y6Ya';
    const refresh = 'ZXxvgcsy1I6XPKmHte4qBeTVhZk7RnuC';

    // hueApi = hueTools.hueDebugLogin(remoteBootstrap, username, access, refresh);
    hueTools.debugLogin(remoteBootstrap, username, access, refresh)
        .then(data => {
            console.log(data);
            hueApi = data;
            res.send({
                status: 'success',
                data: {
                    username: username,
                    accessToken: access,
                    accessTokenExpiration: data._config._remoteApi._tokens._data.accessToken.expiresAt,
                    refreshToken: refresh,
                    refreshTokenExpiration: data._config._remoteApi._tokens._data.refreshToken.expiresAt,
                }
            });
        })
        .catch(err => {
            console.log(err);
            res.send({
                status: 'error',
                message: err
            });
        });
});

// router.get('/hue-refresh', function(req, res){
//     hueTools.tokenRefresh(hueApi)
//         .then(data => {
//             console.log('REFRESH', data);
//         })
//         .catch(err => {
//            console.log('REFRESH FAIL', err);
//         });
// });


router.get('/hue-getLights', function(req, res){

    const session = checkHueSession(req, res);

    if(session){
        getHueApi(session)
            .then(api => {
                hueTools.getLights(api)
                    .then(data => {
                        console.log('DATA', data);
                        res.send({
                            status: 'success',
                            data: {
                                lights: data
                            }
                        });
                    })
                    .catch(err => {
                        console.log('ERR', err);
                        res.send({
                            status: 'error',
                            message: err.message
                        });
                    });
            })
            .catch(e => {
                res.send({
                    status: 'error',
                    message: e.message
                });
            });
    }
});


router.get('/vibrant-color', function(req, res){
    if (!req.query.imageURL){
        res.send({
            status: 'error',
            message: 'Server did not receive a URL of an image!'
        });
    }
    else{
        vibrantTools.colorFromUrl(req.query.imageURL)
            .then(data => { // Success getting hsl and rgb color
                res.send({
                    status: 'success',
                    data: data
                });
            })
            .catch(err => { // Error getting color from URL
                res.send({
                    status: 'error',
                    message: err.message
                });
            });
    }
});

// POST request has hsl in body to set lights and optionally brightness
router.post('/hue-setLights', function(req, res, next){

    console.log(req.body);

    const session = checkHueSession(req, res);

    if(session){
        if (req.body.hsl){
            let hsl, brightness;

            hsl = req.body.hsl;

            // check hsl parameter
            if(
                hsl.length !== 3 ||
                typeof(hsl[0]) !== 'number' ||
                typeof(hsl[1]) !== 'number' ||
                typeof(hsl[2]) !== 'number' ||
                (hsl[0] < 0 || hsl[0] > 360) ||
                (hsl[1] < 0 || hsl[1] > 100) ||
                (hsl[2] < 0 || hsl[2] > 100)
            ){
                console.log('Response Error: ', 'Server did not receive valid values for hsl!', '\nhsl: ', req.body.hsl);
                res.send({
                    status: 'error',
                    message: 'Server did not receive valid values for hsl!'
                });
                return;
            }

            // check brightness parameter
            if (!req.body.brightness){
                brightness = undefined; // maybe 100 ?
            }
            else if (!(req.body.brightness <= 1.0 && req.body.brightness > 0)){
                console.log('Response Error: ', 'Server did not receive a valid value for Brightness!', '\nBrightness: ', req.body.brightness);
                res.send({
                    status: 'error',
                    message: 'Server did not receive a valid value for Brightness!'
                });
                return;
            }
            else {
                brightness = req.body.brightness;
            }

            getHueApi(session)
                .then(api => {
                    hueTools.setLights(api, lightIDs, hsl, brightness)
                        .then(() => {
                            res.send({
                                status: 'success',
                                data: {}
                            })
                        })
                        .catch(err => {
                            console.log(err);
                            res.send({
                                status: 'error',
                                message: err.message
                            });
                        });
                })
                .catch(e => {
                    res.send({
                        status: 'error',
                        message: e.message
                    });
                });
        }
        else { // missing hsl parameter
            console.log('Response Error: ', 'Server did not receive a valid request!', '\nBody:', req.body);
            res.send({
                status: 'error',
                message: 'Server did not receive a valid request, hsl missing!'
            });
        }
    }
});

// Command to Turn off lights. No parameters necessary
router.get('/hue-lightsOff', function(req, res){

    let session = checkHueSession(req, res);

    if(session){
        getHueApi(session)
            .then(api => {
                hueTools.lightsOff(api, lightIDs)
                    .then(() => {
                        res.send({
                            status: 'success',
                            data: {}
                        })
                    })
                    .catch(err => {
                        res.send({
                            status: 'error',
                            message: err.message
                        });
                    });
            })
            .catch(e => {
                res.send({
                    status: 'error',
                    message: e.message
                });
            });
    }
});


router.get('/test', function (req, res){

    // const SESSIONID = 'pat';
    //
    // databaseTools.initialize(SESSIONID, remoteBootstrap)
    //     .then(data => {
    //         console.log('TL data:', data);
    //         hueApis.set(SESSIONID, data);
    //         res.send ({
    //             status: 'success',
    //             data: {}
    //         })
    //     })
    //     .catch(err => {
    //         console.log('TL err:', err);
    //         res.send ({
    //             status: 'error',
    //             data: err.message
    //         })
    //     })
});

var getHueApi = async function (sessionId){
    if(hueApis.has(sessionId)){ // case that API connected to session has been cached
        return hueApis.get(sessionId);
    }
    else{ // case that API connected to session has to be initialized
        return databaseTools.initialize(sessionId, remoteBootstrap)
            .then(api => {
                hueApis.set(sessionId, api);
                return api;
            })
            .catch(err => {
                console.log(err); // do not remove console log. Outputs details of failure.
                return Promise.reject(Error('Could not find or initialize API connected to Session! Check logs.'));
            });
    }
}

var checkHueSession = function(req, res){
    if(req.query.session){ // for get requests
        return req.query.session
    }
    else if(req.body.session){ // for posts requests
        return req.body.session;
    }
    else{
        res.send({
            status: 'error',
            message: 'No identifying Session was attached to the request!'
        });
        return null;
    }
}

const spotifyApi = new SpotifyWebApi({
    clientId: '954319b997ba428fad69349169e417d2',
    clientSecret: '',
    redirectUri: 'http://localhost:3000/hue/api/spotify-callback'
});

const hueApiCredentials = {
    clientId: 'gkQhDWDqa9GY05OO1tjeUbevD8OAHAhq',
    clientSecret: '',
    appId: 'spotify-hue',
    redirectUri: 'http://localhost:3000/hue/api/hue-callback',
    deviceName: 'spotify-hue-node-api'
}

const remoteBootstrap = v3.api.createRemote(hueApiCredentials.clientId, hueApiCredentials.clientSecret);


let hueApi = undefined;
let hueApis = new Map();

let lightIDs = [3,4,5];


module.exports = router;
