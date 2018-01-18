var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	error = req.params.error
	res.render('index', { title: 'Express', error: error });
});

module.exports = router;
