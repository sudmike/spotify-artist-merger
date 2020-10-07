var createError = require('http-errors');

module.exports = {

    checkArtist: async function(spotifyApi, artist){

        // artist input field left empty
        if(artist === undefined || artist === '') return Promise.reject(new Error('empty artist field'))

        // search Spotify with artist input and return artist if resolved and error if rejected
        return spotifyApi.searchArtists(artist, {limit: 1, offset: 0})
            .then(function(data) {
                if(data.statusCode !== 200){
                    //return Non 200 status code error
                    return Promise.reject(new Error('non 200 status code'))
                }

                else{
                    if(data.body.artists.items.length === 0){
                        //return artist not found Error
                        return Promise.reject(new Error("artist not found"))
                    }
                    else{
                        return Promise.resolve(data.body.artists.items[0].name)
                    }
                }
            })
            .catch(function(err) {
                //return artist fetch error
                return Promise.reject(new Error("artist fetch error"))
            })
    },

    generatePlaylistAndFill: async function(spotifyApi, artists, title = generateTitle(artists)){
        console.log('Title: ', title)
        console.log('Description: ', generateDescription(artists))
        var songList = await generateSongList(spotifyApi, artists).catch(err => { return Promise.reject(err) })

        return await spotifyApi.createPlaylist(await getUsername(spotifyApi).catch(err=>{return Promise.reject(err)}), title, {'public' : false, 'description' : generateDescription(artists)})
            .then(function(data){
                if(songList.length > 0){
                    spotifyApi.addTracksToPlaylist(data.body.id, songList)
                        .catch(err => { return Promise.reject(createError(err.statusCode, 'add track error')) })
                }

                //return Playlist ID
                return Promise.resolve(data.body.id)
            })
            .catch(function(err){
                //return playlist creation error redirect
                return Promise.reject(createError(err.statusCode, 'playlist creation error'))
            })
    }
}

var generateTitle = function(artists){
    var playlistName = 'These are '

    if(artists.length === 2) playlistName += artists[0] + ' and ' + artists[1]
    else if(artists.length === 3) playlistName += artists[0] + ', ' + artists[1] + ' and ' + artists[2]
    else playlistName += artists[0] + ', ' + artists[1] + ' and others'

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

var getUsername = async function(spotifyApi){
    return spotifyApi.getMe()
        .then(function(data){
            return Promise.resolve(data.body.id)
        })
        .catch(function(err) {
            //return user fetch error redirect
            return Promise.reject(createError(err.statusCode, 'user fetch error'))
        })
}

var generateSongList = async function(spotifyApi, artists, nrOfSongs = 20){
    var songList = []

    //create song List from each artists This Is playlist
    for (var i = 0; i < artists.length; i++){
        songList = songList.concat(await extractTracksOfArtist(spotifyApi, artists[i], nrOfSongs)
            .catch(err=>{ return Promise.reject(err) }))
    }

    return await shuffleArray(songList)
}

var extractTracksOfArtist = async function(spotifyApi, artist, nrOfSongs){
    var songURIs = []

    //get the 'This is <artist>' playlist ID to then search for playlist
    return getThisIsPlaylistId(spotifyApi, artist)
        .then(function(playlistId) {

            //get Playlist with all tracks
            return spotifyApi.getPlaylist(playlistId)
                .then(function(data){
                    if(data.statusCode !== 200){
                        //return Non 200 status code error redirect
                        return Promise.reject(createError(data.statusCode,'Non 200 status code error'))
                    }
                    else{
                        //Transfer all Track URIs != null from Playlist to array
                        for(var i = 0; i < data.body.tracks.items.length; i++){
                            if(data.body.tracks.items[i].track !== null) songURIs.push(data.body.tracks.items[i].track.uri)
                        }

                        //return filtered array filled with Track URIs
                        return Promise.resolve(trimSongSelection(songURIs, nrOfSongs))
                    }
                })
                .catch(function(err){
                    //return playlist retrieval error redirect
                    return Promise.reject(createError(err.statusCode,'playlist retrieval error'))
                })
        })
        .catch(function(err){
            //return rejection redirect of Function getThisIsPlaylistId
            return Promise.reject(err)
        })
}

var getThisIsPlaylistId = async function(spotifyApi, artist){
    return spotifyApi.searchPlaylists('This Is ' + artist, {limit:1,offset:0})
        .then(function(data){
            if(data.statusCode !== 200){
                //return Non 200 status code error redirect
                return Promise.reject(createError(data.statusCode,'Non 200 status code error'))
            }
            else if(data.body.playlists.items[0].owner.id !== 'spotify'){
                //return missing artist page error redirect //better check in the beginning
                return Promise.reject(createError(406,'missing artist page error'))
            }
            else{ //passed all checks
                return Promise.resolve(data.body.playlists.items[0].id)
            }
        })
        .catch(function(err){
            //return artist page retrieval error redirect
            return Promise.reject(createError(err.statusCode,'artist page retrieval error'))
        })

}

var trimSongSelection = function(songList, nrOfSongs = songList.length/3){

    //No need to go through if all will be returned anyway
    if(songList.length <= nrOfSongs) return songList
    else{
        //Split Songs into categories based on popularity
        var hotSongs = songList.slice(0, songList.length*(1/6))
        var mediumSongs = songList.slice(hotSongs.length, hotSongs.length+songList.length*(1/4))
        var coldSongs = songList.slice(mediumSongs.length)

        //Shuffle Song pools once
        hotSongs = shuffleArray(hotSongs)
        mediumSongs = shuffleArray(mediumSongs)
        coldSongs = shuffleArray(coldSongs)

        songList = []

        //Randomly Select a song pool to add a song to the song list Hunger Games Style. Songs in hotter pools have a higher chance to be picked
        for(var i = 0; i < nrOfSongs; i++){
            var randomRealm = hotSongs.length*3 + mediumSongs.length*2 + coldSongs.length
            var randomSelection = Math.random()*randomRealm

            //console.log('H:', hotSongs.length, ', M:', mediumSongs.length, ', C:', coldSongs.length, '. Realm: ', randomRealm, ', Selection: ', randomSelection)

            if(randomSelection <= hotSongs.length*3) songList.push(hotSongs.pop())
            else if(randomSelection <= hotSongs.length*3 + mediumSongs.length*2) songList.push(mediumSongs.pop())
            else songList.push(coldSongs.pop())
        }

        return songList
    }
}

var shuffleArray = function(array){
    for(let i = array.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * i)
        const temp = array[i]
        array[i] = array[j]
        array[j] = temp
    }
    return array
}