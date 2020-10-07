var express = require('express');
var tools = require('../public/javascripts/tools');
var router = express.Router();

var artists = []

/* GET overview page. */
router.get('/', function(req, res) {

    artists = []
    res.render('overview')

});


/* Input of Artist */
router.post('/', function(req,res){

    //verify that the input is a valid artist and add their correct name
    tools.checkArtist(spotify.spotifyApi, req.body['artist'])
        .then(data => {
            //Check that the artist has not already been added
            if(artists.indexOf(data) === -1) {
                artists.push(data)
            }

            else{
                /* Local Error Handling */
                console.log(new Error("This artist was already added"));
            }
        })
        .catch(err => {
            /*Local Error Handling*/
            console.log(err)
        })

    res.render('overview')
})

/* Create Playlist */
router.post('/artistSelectionDone', function(req, res, next){

    console.log('Create Playlist with these Artists: ', artists)

    if(req.body['playlistName'] !== '')
        var playlistName = req.body['playlistName']

    tools.generatePlaylistAndFill(spotify.spotifyApi, artists, playlistName)
        .then(data=>{
            console.log('Playlist created: ', data)

            res.redirect('/overview')
        })
        .catch(err=>{
            //err is a HTTP-Error
            next(err)
        })
})

module.exports = router;
