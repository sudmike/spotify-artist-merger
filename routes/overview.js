var express = require('express');
var tools = require('../public/javascripts/tools');
var router = express.Router();

var artists = []

/* GET overview page. */
router.get('/', function(req, res, next) {

    artists = []
    res.render('overview')

});


/* Input of Artist */
router.post('/artistInput', function(req,res){

    //verify that the input is a valid artist and add their correct name
    tools.checkArtist(spotify.spotifyApi, req.body['artist'])
        .then(data => {
            //Check that the artist has not already been added
            if(artists.indexOf(data) === -1) {
                artists.push(data)
                console.log('In Overview.js: ', data)
            }

            else{
                /* Local Error Handling */
                console.log(new Error("This artist was already added"));
            }
        })
        .catch(err => {
            /*Local Error Handling*/
            console.log('Error in overview.js', err)
        })

    res.render('overview')
})

/* Create Playlist */
router.post('/artistSelectionDone', function(req, res){

    console.log('Create Playlist with these Artists: ', artists)

    //Back to default state
    res.redirect('/overview')

})

module.exports = router;
