var express = require('express');
var router = express.Router();


/* GET overview page. */
router.get('/', function(req, res, next) {

    res.render('overview')

});

module.exports = router;
