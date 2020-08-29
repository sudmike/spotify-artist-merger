
module.exports = {

    checkArtist: async function(spotifyApi, artist){
        var response //Because I just do not understand how to return in asynchronous functions... (for another commit)

        // artist left empty
        if(artist === undefined || artist === '') return Promise.reject(new Error("Nothing in Artist field"))

        // search Spotify with artist input and return artist if resolved and error if rejected
        await spotifyApi.searchArtists(artist, {limit: 1, offset: 0})
            .then(function(data) {
                if(data.statusCode !== 200){
                    /* Error Handling */
                    response = Promise.reject(new Error("Status Code of Spotify not 200"))
                }

                else{
                    if(data.body.artists.items.length === 0){
                        response = Promise.reject(new Error("Could not find artist"))
                    }
                    else{
                        response = Promise.resolve(data.body.artists.items[0].name)
                    }
                }
            }
            )
            .catch(function(err) {
                /* Error Handling */
                response = Promise.reject(new Error("Artist fetch Error"))
            })
        return response
    }

}