var express = require('express');

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
	"lockout", 
	"bingo_count", 
	"bingo_count_type", 
	"difficulty_raw", 
	"length_raw", 
	"characters", 
	"apples", 
	"tutorials", 
	"difficults", 
	"yottass", 
	"sfinesse", 
	"scomplete",
	"bcomplete",
	"dcomplete",
	"lowdash", 
	"lowjump", 
	"lowattack", 
	"lowdirection"
];

function build(io) {
	var session = require('../src/session')(io);
	var router = express.Router();

	router.get('/', function(req, res, next) {
		if(verify(params, req.query)) {
			var s = session.newSession(req.query);
			console.log(s);
			res.redirect('/session/' + s.id);
		} else {
			var err = new Error('Not Found');
			err.status = 404;
			next(err);
		}
	});

	router.get('/:id', function(req, res, next) {
		console.log(`getting room ${req.params.id}`);
		if(!session.getSession(req.params.id)) {
			var err = new Error('Not Found');
			err.status = 404;
			next(err);
			return;
		}
		var s = session.getSession(req.params.id)
		res.render('session', {
			session: s,
			size: s.bingo_args.size,
			wincondition: s.bingo_args.bingo_count + " " + s.bingo_args.bingo_count_type + (s.bingo_args.bingo_count > 1 ? "s" : ""),
			save: s.bingo_args.save,
			difficulty: s.bingo_args.difficulty_raw,
			length: s.bingo_args.length_raw,
			lockout: s.bingo_args.lockout ? "on" : "off",
			options: s.getBingoGoalOptions()
		});
	});

	router.get('/:id/popout', function(req, res, next) {
		console.log(`getting room ${req.params.id}`);
		if(!session.getSession(req.params.id)) {
			var err = new Error('Not Found');
			err.status = 404;
			next(err);
			return;
		}
		var s = session.getSession(req.params.id)
		res.render('popout', {
			session: s,
			size: s.bingo_args.size
		});
	});
	return router;
}

module.exports = build;