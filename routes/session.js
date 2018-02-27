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
	"gametype", 
	"size", 
	"lockout", 
	// "save",
	"newgame", 
	"newgame64", 
	"teams", 
	"teams64", 
	"hidden", 
	"hidden64", 
	"plugins", 
	"plugins64", 
	"bingo_count", 
	"bingo_count_type", 
	"goal_count", 
	"difficulty_raw", 
	"length_raw", 
	"beat", 
	"ss", 
	"ss64", 
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
	"lowdirection",
	"win_type",
	"shuffle",
	"captureblank",
	"captureother",
	"hub"
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
		var wincondition = (s.bingo_args.gametype == "64")
			? (	s.bingo_args.win_type == "area" ? "biggest connected area" : (
				s.bingo_args.win_type == "totalarea" ? "most total area" :
				"first to " + s.bingo_args.bingo_count + " goal" + (s.bingo_args.bingo_count > 1 ? "s" : "")))
			: ("first to " + s.bingo_args.bingo_count + " " + s.bingo_args.bingo_count_type + (s.bingo_args.bingo_count > 1 ? "s" : ""));

		res.render('session', {
			session: s,
			wincondition: wincondition,
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