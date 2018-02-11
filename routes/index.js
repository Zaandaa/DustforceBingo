var express = require('express');
var options = require('../src/options');
var invalidsets = require('../src/invalidsets');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	error = req.query.error;
	res.render('index', { title: 'Express', error: error, options: options, invalidsets: invalidsets });
});

module.exports = router;
