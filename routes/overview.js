var express = require('express');
var router = express.Router();

var artists = []

/* GET overview page. */
router.get('/', function(req, res, next) {

    artists = []
    res.render('overview')

});


/* Input of Artist */
router.post('/artistInput', function(req,res){

    artists.push(req.body['artist'])

    console.log(artists)

    res.render('overview')
})

/* Create Playlist */
router.post('/artistSelectionDone', function(req, res){

    console.log('Create Playlist with these Artists: ', artists)

    //Back to default state
    res.redirect('/overview')

})

module.exports = router;
