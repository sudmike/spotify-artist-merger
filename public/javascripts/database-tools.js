var axios = require('axios');
var hueTools = require('../../public/javascripts/hue-tools');


const databaseUrl = 'https://ng-spotify-hue-default-rtdb.europe-west1.firebasedatabase.app/hue-credentials';

var initialize = async function(sessionID, bootstrap){
    return getDatabaseEntry(sessionID)
        .then(data => {
            if(data.key){ // dataset found in database
                const current = Math.round(Date.now()/1000);
                if(current + (60*60*24) < data.dataset.accessTokenExpiration){ // access token is valid
                    return {
                        api: bootstrap.connectWithTokens(
                            data.dataset.accessToken,
                            data.dataset.refreshToken,
                            data.dataset.username
                        ),
                        lights: data.dataset.activeLights
                    }
                }
                else { // access token is expired
                    if(current < data.dataset.refreshTokenExpiration){ // new access token can be generated
                        return bootstrap.connectWithTokens('', data.dataset.refreshToken, data.dataset.username)
                            .then(tempApi => {
                                return hueTools.tokenRefresh(tempApi)
                                    .then(data2 => { // tokens were successfully generated
                                        return updateDatabaseTokens(sessionID, data2.accessToken.value, data2.accessToken.expiresAt, data2.refreshToken.value, data2.refreshToken.expiresAt)
                                            .then(() => { // tokens were successfully sent to database
                                                return {
                                                    api: bootstrap.connectWithTokens(
                                                        data2.accessToken,
                                                        data2.refreshToken,
                                                        data.dataset.username
                                                    ),
                                                    lights: data.dataset.activeLights
                                                }
                                            })
                                            .catch(err => {
                                                return (err instanceof Error)
                                                    ? Promise.reject(err)
                                                    : Promise.reject(Error('Could not update expired tokens!'));
                                            });
                                    })
                                    .catch(err => {
                                        return Promise.reject(err); // tokenRefresh() only rejects in form of Errors. No need to check.
                                    })

                            })
                            .catch(e => {
                                return Promise.reject(e);
                            })
                    }
                    else { // refresh token is expired
                        return null;
                    }
                }
            }
            else { // dataset not found in database
                return Promise.reject(Error('Session is not in Firebase!'));
            }
        })
        .catch(err => {
            return Promise.reject(err);
        });
}

var postDatabaseEntry = async function(sessionID, username, access, accessExpiration, refresh, refreshExpiration){
    return axios.post(
        databaseUrl + '.json',
        {
            session: sessionID,
            username: username,
            accessToken: access,
            accessTokenExpiration: accessExpiration,
            refreshToken: refresh,
            refreshTokenExpiration: refreshExpiration
        }
    )
        .then(data => {
            if(data.status === 200){
                return Promise.resolve();
            }
            else{
                return Promise.reject(Error('Attempt to post new database entry resulted in a non 200 status!'));
            }
        })
        .catch(err => {
            return (err instanceof Error)
                ? Promise.reject(err)
                : Promise.reject(Error('Post request to add new database entry failed!'));
        })
}

var updateDatabaseTokens = async function(sessionID, access, accessExpiration, refresh, refreshExpiration){
    return getDatabaseEntry(sessionID) // get database key
        .then(data => {
            return axios.patch( // update values in database
                databaseUrl + '/' + data.key + '.json',
                {
                    accessToken: access,
                    accessTokenExpiration: accessExpiration,
                    refreshToken: refresh,
                    refreshTokenExpiration: refreshExpiration
                }
            )
                .then(data2 => {
                    if(data2.status !== 200){
                        return Promise.reject(Error('Could not update tokens in database!'))
                    }
                    else{
                        return 'Tokens successfully written to database';
                    }
                })
                .catch(err => {
                    return (err instanceof Error)
                        ? Promise.reject(err)
                        : Promise.reject(Error('Could not update tokens in database!'));
                });

        })
        .catch(err => {
            return Promise.reject(err); //getDatabaseEntry() only rejects in form of Errors. No need to check.
        });
}

var updateDatabaseActiveLights = async function(sessionID, lightIDs){
    return getDatabaseEntry(sessionID) // get database key
        .then(data => {
            return axios.patch( // update values in database
                databaseUrl + '/' + data.key + '.json',
                {
                    activeLights: lightIDs,
                }
            )
                .then(data2 => {
                    if(data2.status !== 200){
                        return Promise.reject(Error('Could not update lights in database!'))
                    }
                    else{
                        return 'Lights successfully written to database';
                    }
                })
                .catch(err => {
                    return (err instanceof Error)
                        ? Promise.reject(err)
                        : Promise.reject(Error('Could not update lights in database!'));
                });
        })
        .catch(err => {
            return Promise.reject(err); //getDatabaseEntry() only rejects in form of Errors. No need to check.
        });
}

var getDatabaseEntry = async function(sessionID){
    return axios.get(
        databaseUrl + '/.json'
    )
        .then(d => {
            if(d.status !== 200){
                Promise.reject(Error('Firebase returns non 200 return code!'));
            }
            else{
                for (const key in d.data){
                    if(d.data[key].session === sessionID){
                        return {
                            key: key,
                            dataset: {
                                username: d.data[key].username,
                                accessToken: d.data[key].accessToken,
                                accessTokenExpiration: d.data[key].accessTokenExpiration,
                                refreshToken: d.data[key].refreshToken,
                                refreshTokenExpiration: d.data[key].refreshTokenExpiration,
                                activeLights: d.data[key].activeLights
                            }
                        }
                    }
                }
                return {
                    key: null,
                    dataset: null
                }
            }
        })
        .catch(err => {
            return (err instanceof Error)
                ? Promise.reject(err)
                : Promise.reject(Error('Could not communicate with Firebase!'));
        });
}

var getDatabaseActiveLights = async function(sessionID){
    return getDatabaseEntry(sessionID)
        .then(data => {
            if(data.key){
                return data.dataset.activeLights;
            }
            else {
                return Promise.reject(Error('Could not get dataset related to session!'));
            }
        })
        .catch(err => {
            return (err instanceof Error)
                ? Promise.reject(err)
                : Promise.reject(Error('Could not get active lights from database!'))
        });
}


module.exports = {initialize, postDatabaseEntry, updateDatabaseActiveLights, getDatabaseActiveLights}
