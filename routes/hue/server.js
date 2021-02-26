var express = require('express');
var router = express.Router();
var SpotifyWebApi = require('spotify-web-api-node');
var v3 = require('node-hue-api').v3;
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
            if(!data.api){
                const url = frontendURL + '?error=' + 'Could not create hue api!';
                res.redirect(url);
            }
            else if(!data.credentials){
                const url = frontendURL + '?error=' + 'Could not find all hue credentials!';
                res.redirect(url);
            }
            else{
                const freshSession = hueTools.generateRandomString(8); //... random string (8 characters letters)
                hueApis.set(freshSession, data.api);

                databaseTools.postDatabaseEntry(
                    freshSession,
                    data.credentials.username,
                    data.credentials.accessToken,
                    data.credentials.accessTokenExpiration,
                    data.credentials.refreshToken,
                    data.credentials.refreshTokenExpiration
                )
                    .then(() => { // hue credentials successfully written to db
                        hueTools.getLights(data.api) // next step: update database to include light IDs
                            .then(lights => {
                                databaseTools.updateDatabaseActiveLights( // write all lightIDs into database as active
                                    freshSession,
                                    lights.map(d => {return d.id;})
                                )
                                    .then(() => {
                                        res.redirect(
                                            frontendURL +
                                            '?session=' + freshSession
                                        );
                                    })
                                    .catch(err => {
                                        console.log(err);
                                        const url = frontendURL + '?error=' + err.message;
                                        res.redirect(url);
                                    });
                            })
                            .catch(err => {
                                console.log(err)
                                const url = frontendURL + '?error=' + err.message;
                                res.redirect(url);
                            });
                    })
                    .catch(err => {
                        console.log(err);
                        const url = frontendURL + '?error=' + err.message;
                        res.redirect(url);
                    });
            }
        })
        .catch(err => {
            const url = frontendURL + '?error=' + err.message
            res.redirect(url);
        });
});

router.get('/hue-getLights', async function(req, res){

    const session = await checkHueSession(req, res);

    if(session){
        getHueApi(session)
            .then(api => {
                hueTools.getLights(api)
                    .then(lights => {
                        databaseTools.getDatabaseActiveLights(session)
                            .then(actives => {
                                res.send({
                                    status: 'success',
                                    data: {
                                        lights: lights.map(l => {
                                            return {
                                                name: l.name,
                                                id: l.id,
                                                reachable: l.reachable,
                                                active: actives.includes(l.id)
                                            }
                                        })
                                    }
                                })

                            })
                            .catch(err => {
                                console.log(err);
                                res.send({
                                    status: 'error',
                                    message: err.message
                                });
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
});

router.post('/hue-chooseLights', async function(req, res){
    const session = await checkHueSession(req, res);

    if(session){
        if(!req.body.lightIDs){
            res.send({
                status: 'error',
                message: 'Server did not receive any values for light IDs!'
            });
        }
        else {
            getHueApi(session)
                .then(api => {
                    hueTools.getLights(api)
                        .then(lights => {
                            let pass = true;
                            for(const lightID of req.body.lightIDs){ // compare lights from request with existing lights
                                if(!lights.map(d => {return d.id}).includes(lightID)){
                                    res.send({
                                        status: 'error',
                                        message: 'Server did not receive valid values for light IDs!'
                                    });
                                    pass = false;
                                    return;
                                }
                            }
                            if(pass){
                                databaseTools.updateDatabaseActiveLights(session, req.body.lightIDs)
                                    .then(() => {
                                        hueLights.set(session, req.body.lightIDs);
                                        res.send({
                                            status: 'success',
                                            data: {}
                                        });
                                    })
                                    .catch(err => {
                                        res.send({
                                            status: 'error',
                                            message: err.message
                                        });
                                    });
                            }
                        })
                        .catch(err => {
                            res.send({
                                status: 'error',
                                message: err.message
                            });
                        });
                })
                .catch(err => {
                    res.send({
                        status: 'error',
                        message: err.message
                    });
                });
        }
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
router.post('/hue-setLights', async function(req, res, next){

    console.log(req.body);

    const session = await checkHueSession(req, res);

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
                    hueTools.setLights(api, getLightIDs(session), hsl, brightness)
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

// Command to Turn off lights. Parameter lightID is optional
router.post('/hue-lightsOff', async function(req, res){

    let session = await checkHueSession(req, res);

    if (session) {
        getHueApi(session)
            .then(api => {
                hueTools.lightsOff(
                    api, (req.body.lightID)
                        ? req.body.lightID
                        : getLightIDs(session)
                )
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
            .catch(err => {
                res.send({
                    status: 'error',
                    message: err.message
                });
            });
    }

});

router.post('/hue-pingLight', async function(req, res){

    let session = await checkHueSession(req, res);

    if(session){
        if(!req.body.lightID){
            res.send({
                status: 'error',
                message: 'Server did not receive light IDs in request!'
            });
        }
        else {
            getHueApi(session)
                .then(api => {
                    hueTools.pingLight(api, req.body.lightID)
                        .then(() => {
                            res.send({
                                status: 'success',
                                body: {}
                            });
                        })
                        .catch(err => {
                            console.log(err);
                            res.send({
                                status: 'error',
                                message: 'Failed to ping lights! Check logs for more information.'
                            });
                        });
                })
                .catch(err => {
                    res.send({
                        status: 'error',
                        message: err.message
                    });
                });
        }
    }
});


router.get('/test', function (req, res){

    const session = checkHueSession(req, res);

});

var getHueApi = async function (sessionId){
    if(hueApis.has(sessionId)){ // case that API connected to session has been cached
        return hueApis.get(sessionId);
    }
    else{ // case that API connected to session has to be initialized
        return databaseTools.initialize(sessionId, remoteBootstrap)
            .then(data => {
                hueApis.set(sessionId, data.api);
                hueLights.set(sessionId, data.lights)
                return data.api;
            })
            .catch(err => {
                console.log(err); // do not remove console log. Outputs details of failure.
                return Promise.reject(Error('Could not find or initialize API connected to Session! Check logs.'));
            });
    }
}

var getLightIDs = function (sessionId){
    return hueLights.get(sessionId);
}

// check session in authorization header and ensures that hueApi is cached
var checkHueSession = async function(req, res){

    if (!req.headers.authorization){ // authorization header not attached
        res.send({
            status: 'error',
            message: 'No identifying Session was attached to the request!'
        });
        return null;
    }
    else { // authorization header attached
        return getHueApi(req.headers.authorization) // check if session exists by looking for hue api
            .then(() => { // session :)
                return req.headers.authorization;
            })
            .catch(() => { // session :(
                res.send({
                    status: 'error',
                    message: 'Identifying Session could not be found! Check logs.'
                });
                return null;
            });
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

let hueApis = new Map();
let hueLights = new Map();

module.exports = router;
