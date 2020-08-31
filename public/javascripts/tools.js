var numWords = require('num-words')
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
    },

    generatePlaylistAndFill: async function(spotifyApi, artists){
        console.log('Title: ', generateTitle(artists))
        console.log('Description: ', generateDescription(artists))
    }
}

var generateTitle = function(artists){
    var playlistName = 'These are '

    if(artists.length === 2) playlistName += artists[0] + ' and ' + artists[1]
    else if(artists.length === 3) playlistName += artists[0] + ', ' + artists[1] + ' and ' + artists[2]
    else playlistName += artists[0] + ', ' + artists[1] + ' and ' + numWords(artists.length-2) + ' others'

    return playlistName
}

var generateDescription = function(artists){
    artists = prepArtistsForDescription(artists)

    var playlistDescription = 'This Playlist was auto-generated! '

    playlistDescription += 'Artists are ' + artists[0]
    for(var i = 1; i < artists.length-1; i++){
        playlistDescription += ', ' + artists[i]
    }
    playlistDescription += ' and ' + artists[artists.length-1] + '.'

    return playlistDescription
}

/* Sort artists and take Commas out of names to prevent confusion of delimiters. Eg 'Tyler, the creator' to 'Tyler the creator' */
var prepArtistsForDescription = function(artists){
    artists.sort()

    for(var i = 0; i < artists.length; i++){
        artists[i] = artists[i].replace(/,/g,'') //remove all commas
    }
    return artists
}