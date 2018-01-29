var express = require('express');
var options = require('../src/options');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	error = req.query.error;
	res.render('index', { title: 'Express', error: error, options: options });
});

module.exports = router;
