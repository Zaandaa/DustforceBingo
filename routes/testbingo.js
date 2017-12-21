var express = require('express');
var router = express.Router();
var Bingo = require('../src/bingo');

var seedChars = "1234567890qwertyuiopasdfghjklzxcvbnm";
var seedLength = 8;
var seed = "";
for (var i = 0; i < seedLength; i++) {
	seed += seedChars.charAt(Math.floor(Math.random() * seedChars.length));
}

var rules = {
	seed: seed,
	save: "newgame",
	size: 5,
	lockout: true,
	bingo_count: 1,
	bingo_count_type: "bingo",
	difficulty: 1,
	length: 1,
	characters: true,
	apples: true,
	tutorials: true,
	difficults: true,
	yottass: true,
	lowdash: true,
	lowjump: true,
	lowattack: true,
	lowdirection: true,
	lowpercent: true,
	somepercent: true
};

var bingo = new Bingo(null, rules);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('testbingo', { title: 'Test', boardData: bingo.getBoardData() });
});

module.exports = router;
