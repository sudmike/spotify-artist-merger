var express = require('express');
var router = express.Router();

/* GET error page. */
router.get('/', function(req, res, next) {

    res.render('error', { error: ''/*Error Handling in progress*/ });

});

module.exports = router;
