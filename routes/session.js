var express = require('express');
var session = require('../src/session');
var router = express.Router();

function verify(fields, data) {
	var b = true;
	fields.forEach(function(field) {
		if (!(field in data)) {
			b = false;
		}
	});
	return b;
}

var params = [
	"save", 
	"size", 
	"bingo_type", 
	"bingo_count", 
	"bingo_count_type", 
	"characters", 
	"apples", 
	"difficults", 
	"yottass", 
	"lowdash", 
	"lowjump", 
	"lowdirection"
];

/* GET home page. */
router.get('/', function(req, res, next) {
	if(verify(params, req.query)) {
		console.log(req.query);
		var s = session.newSession(req.query)
		res.redirect('/' + s.id);
	}
});

router.get('/:id', function(req, res, next) {
	if(!session.getSession(req.param.id)) {
		return;
	}
	var s = session.getSession(req.param.id)
	res.render('session', { board: s });
});

module.exports = router;