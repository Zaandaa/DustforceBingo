var express = require('express');
var options = require('../src/options');

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
	"teams", 
	"hidden", 
	"plugins", 
	"bingo_count", 
	"bingo_count_type", 
	"difficulty_raw", 
	"length_raw", 
	"beat", 
	"ss", 
	"keys", 
	"multilevel", 
	"characters", 
	"apples", 
	"tutorials", 
	"difficults", 
	"yottass", 
	"sfinesse", 
	"scomplete",
	"bcomplete",
	"dcomplete",
	"nosuper",
	"genocide",
	"unload",
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
			// console.log(s);
			if (s.error != "")
				res.redirect('/bingo?error=' + s.error);
			else
				res.redirect('/bingo/session/' + s.id);
		} else {
			var err = new Error('Not Found');
			err.status = 404;
			next(err);
		}
	});

	router.get('/json', function(req, res, next) {
		var a = [];
		for (id in session.rooms)
			a.push(session.rooms[id].getSessionJson());
		res.send(JSON.stringify(a));
	});
	
	router.get('/:id', function(req, res, next) {
		// console.log(`getting room ${req.params.id}`);
		if(!session.getSession(req.params.id)) {
			var err = new Error('Not Found');
			err.status = 404;
			next(err);
			return;
		}
		var s = session.getSession(req.params.id);
		res.render('session', {
			session: s,
			wincondition: s.bingo_args.bingo_count + " " + s.bingo_args.bingo_count_type + (s.bingo_args.bingo_count > 1 ? "s" : ""),
			ruleset: s.bingo_args,
			options: options,
			enabled: s.getBingoGoalOptions()
		});
	});

	router.get('/:id/popout', function(req, res, next) {
		// console.log(`getting room ${req.params.id}`);
		if(!session.getSession(req.params.id)) {
			var err = new Error('Not Found');
			err.status = 404;
			next(err);
			return;
		}
		var s = session.getSession(req.params.id)
		var player = req.query.player;
		var compact = req.query.compact;
		res.render('popout', {
			session: s,
			ruleset: s.bingo_args,
			player: player,
			compact: compact
		});
	});
	
	return router;
}

module.exports = build;