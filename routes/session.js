var express = require('express');
var cookieParser = require('cookie-parser');
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
		var captureText = "off";
		if (s.bingo_args.captureblank && s.bingo_args.captureother)
			captureText = "unclaimed and enemy";
		else if (s.bingo_args.captureblank)
			captureText = "unclaimed only";
		else if (s.bingo_args.captureother)
			captureText = "enemy only";

		var bingoStarted = s.getBingoStarted();

		var user = req.cookies["user"];

		res.render('session', {
			session: s,
			bingoStarted: bingoStarted,
			wincondition: wincondition,
			captureText: captureText,
			ruleset: s.bingo_args,
			options: options,
			enabled: s.getBingoGoalOptions(),
			user: user
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
	
	router.get('/:id/log', function(req, res, next) {
		// console.log(`getting room ${req.params.id}`);
		if(!session.getSession(req.params.id)) {
			var err = new Error('Not Found');
			err.status = 404;
			next(err);
			return;
		}
		var s = session.getSession(req.params.id);
		var bingoFinished = s.getBingoComplete();

		if (!bingoFinished) {
			var err = new Error('Not Found');
			err.status = 404;
			next(err);
			return;
		}

		var wincondition = (s.bingo_args.gametype == "64")
			? (	s.bingo_args.win_type == "area" ? "biggest connected area" : (
				s.bingo_args.win_type == "totalarea" ? "most total area" :
				"first to " + s.bingo_args.bingo_count + " goal" + (s.bingo_args.bingo_count > 1 ? "s" : "")))
			: ("first to " + s.bingo_args.bingo_count + " " + s.bingo_args.bingo_count_type + (s.bingo_args.bingo_count > 1 ? "s" : ""));
		var captureText = "off";
		if (s.bingo_args.captureblank && s.bingo_args.captureother)
			captureText = "unclaimed and enemy";
		else if (s.bingo_args.captureblank)
			captureText = "unclaimed only";
		else if (s.bingo_args.captureother)
			captureText = "enemy only";

		var logBoardData = JSON.parse(s.getBoardData());
		var logPlayerData = JSON.parse(s.getPlayerData());
		var bingoLog = JSON.parse(s.getBingoLog());

		res.render('log', {
			session: s,
			wincondition: wincondition,
			captureText: captureText,
			ruleset: s.bingo_args,
			logBoardData: logBoardData,
			logPlayerData: logPlayerData,
			bingoLog: bingoLog,
			options: options,
			enabled: s.getBingoGoalOptions()
		});
	});
	
	return router;
}

module.exports = build;