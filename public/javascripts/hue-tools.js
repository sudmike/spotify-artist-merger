var LightState = require('node-hue-api').v3.lightStates.LightState;


var login = function(remoteBootstrap, apiBase, res){
    console.log('Login Request from Angular');

    // create and set auth cookie
    const authState = generateRandomString(16);
    res.cookie('hue_auth_state', authState);

    // redirect to hue
    res.redirect(remoteBootstrap.getAuthCodeUrl(apiBase.deviceName, apiBase.appId, authState));
}



var callback = async function(remoteBootstrap, /*callbackURL,*/ req, res){ //spotify: SpotifyWebApi, req: Request, res: Response
    console.log('Callback from Hue received')

    if(req.query.state !== req.cookies['hue_auth_state']) { //check state between spotify and cookie
        /* State Mismatch Error redirect */
        console.log(req.query.state, ' differs from ', req.cookies['spotify_auth_state']);
        // const url = callbackURL + '?error=' + 'hue_state_differs_from_cookie_state';
        return Promise.reject(Error('hue state differs from cookie state'));
        // res.redirect(url);
    }

    else if(req.query.code){ // check that code exists
        res.clearCookie('hue_auth_state') // clear auth state cookie
        console.log(remoteBootstrap);

        return remoteBootstrap.connectWithCode(req.query.code)
            .catch(err => {
                /* Connection Error redirect */
                console.log('Failed to get a remote connection using authorization code.', err);
                // const url = callbackURL + '?error=' + 'hue_failed_to_connect';
                return Promise.reject(Error('hue failed to build remote connection'));
                // res.redirect(url);
            })
            .then(api => {
                const remoteCredentials = api.remote.getRemoteAccessCredentials();
                console.log('Username: ', api._config._config.username)
                console.log('Access: ', remoteCredentials.tokens.access.value);
                console.log('Refresh: ', remoteCredentials.tokens.refresh.value);

                // const url = callbackURL + '?accessToken=' + remoteCredentials.tokens.access.value;

                return {
                    // url: url,
                    api: api,
                    credentials: {
                        username: remoteCredentials.username,
                        accessToken: remoteCredentials.tokens.access.value,
                        accessTokenExpiration: remoteCredentials.tokens.access.expiresAt,
                        refreshToken: remoteCredentials.tokens.refresh.value,
                        refreshTokenExpiration: remoteCredentials.tokens.refresh.expiresAt,
                    }
                }
            })
    }
    else {
        return Promise.reject(Error('no authorization code from hue'))
    }
}


var debugLogin = async function(remoteBootstrap, USERNAME, ACCESS_TOKEN, REFRESH_TOKEN){

    return remoteBootstrap.connectWithTokens(ACCESS_TOKEN, REFRESH_TOKEN, USERNAME)
        .catch(err => {
            console.error('Failed to get a remote connection using existing tokens.');
            return Promise.reject(Error('hue OAuth with Tokens failed'));
        })
        .then(api => {
            console.log('Successfully connected using the existing OAuth tokens.');

            return api;
        })

}

var tokenRefresh = async function(api){
    if(!api){
        return Promise.reject(Error('Could not refresh hue tokens because hue api has not been initialised!'));
    }
    else if(!api._config._remoteApi._tokens._data.refreshToken){ // no refresh Token
        return Promise.reject(Error('Could not refresh hue tokens because no refresh Token was set!'));
    }
    else{
        return api._config._remoteApi.refreshTokens(api._config._remoteApi._tokens._data.refreshToken.value)
            .then(data => {
                if(data._data.accessToken && data._data.refreshToken){
                    data._data.accessToken.expiresAt = Math.round(data._data.accessToken.expiresAt/1000);
                    data._data.refreshToken.expiresAt = Math.round(data._data.refreshToken.expiresAt/1000);
                    return data._data
                }
                else{
                    return Promise.reject(Error('Could not refresh hue tokens because response from hue could not be parsed!'));
                }
            })
            .catch(err => {
                return (err instanceof Error)
                    ? Promise.reject(err)
                    : Promise.reject(Error('Could not refresh hue tokens!'));
            });
    }
}

var getLights = async function(api){
    return api.lights.getAll()
        .then(data => {
            return data
                .filter(light => {
                    return light._data.type.toLowerCase().includes('extended color');
                })
                .map(light => {
                    return {
                        name: light._data.name,
                        id: light._data.id,
                        reachable: light._data.state.reachable,
                    }
                });
        })
        .catch(err => {
            console.log(err);
            return Promise.reject(Error('Could not get lights'))
        });

}

var setLights = async function(api, lightIDs, hsl, brightness = 0.5) {
    const colorLightState = new LightState()
        .on(true)
        .hsl(hsl[0], hsl[1], hsl[2]);

    colorLightState._state.bri = Math.min(colorLightState._state.bri, Math.round(brightness * 255));

    let failedAttempts = [];

    for (let lightID of lightIDs){
        await setLightWithState(api, lightID, colorLightState)
            .catch(err => {
                console.log('Failed setting light!', err);
                failedAttempts.push(lightID);
            });
    }

    return (failedAttempts.length === 0)
        ? Promise.resolve()
        : Promise.reject(Error('Failed to set lights with IDs ' + failedAttempts.toString() + '!'))
}

var pingLight = async function(api, lightID){

    // determine light state for ping
    const pingLightState = new LightState()
        .on(true)
        .hsl(120,100,50)
        .transitionFast()

    // for(const lightID of lightID){
        // determine light state for after ping (original state)
        const originalLightState = await api.lights.getLightState(lightID)
            .then(ogLightState => {
                return ogLightState;
                // return (ogLightState.on)
                //     ? ogLightState // case that light is on
                //     : new LightState() // case that light is off
                //         .off()
                //         .transitionFast()
                //         .bri(ogLightState.bri)
            })
            .catch(() => {
                return new LightState()
                    .off()
                    .transitionFast()
            });

        // send ping out
        return setLightWithState(api, lightID, pingLightState) // set light
            .then(() => {
                return setTimeout(() => {
                    return setLightWithState(api, lightID, originalLightState) // unset light
                        .then(() => {
                            return Promise.resolve();
                        })
                        .catch(() => {
                            return Promise.reject(Error('Failed to reset light during ping!'));
                        });
                }, 700);
            })
            .catch(() => {
                Promise.reject(Error('Failed to set light during ping!'))
            });
    // }
}

var setLightWithState = async function(api, lightID, lightState){
    return api.lights.setLightState(lightID, lightState)
        .then(result => {
            return (result)
                ? Promise.resolve()
                : Promise.reject(Error('Could not set light with ID ' + lightID + '!'));
        })
        .catch(err => {
            return (err instanceof Error)
            ? Promise.reject(err)
            : Promise.reject(Error('Error when calling function to set light with ID ' + lightID + '!'));
        });
}

var lightsOff = async function(api, lightIDs){
    const colorLightState = new LightState()
        .off();

    console.log(lightIDs)
    for (let lightID of lightIDs){
        await api.lights.setLightState(lightID, colorLightState)
            .then(data => {
                if(!data){
                    return Promise.reject(Error('Could not turn off Light with ID ' + lightID + '!'));
                }
            })
            .catch(err => {
                return (err instanceof Error)
                    ? Promise.reject(err)
                    : Promise.reject(Error('Error when calling function to turn off lights!'));
            });
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



module.exports = { login, callback, debugLogin, getLights, setLights, lightsOff, tokenRefresh, generateRandomString, pingLight }
