var express = require('express');
var router = express.Router();
var Bingo = require('../src/bingo');

var seedChars = "1234567890qwertyuiopasdfghjklzxcvbnm";
var seedLength = 8;
var seed = "";
for (var i = 0; i < seedLength; i++) {
	seed += seedChars.charAt(Math.floor(Math.random() * seedChars.length));
}
// seed = "custom";

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

// simplified session for testing
var fakeSession = {
	canStart: function(a) {},
	updateBoard: function() {},
	finish: function() {}
}

var bingo = new Bingo(fakeSession, rules);

// add players
bingo.add_player(10,"P0"); bingo.ready(10);
bingo.add_player(11,"P1"); bingo.ready(11);
// bingo.add_player(1.5,"P1.5"); // not ready, should get removed
// bingo.add_player(2,"P2"); bingo.ready(2);
bingo.start();

var count = 0;
var maxCount = -1; // -1 infinite

var moves = [ // move "pairs": player, goal
	/*[0,0],
	[0,1],
	[0,2],
	[0,3],
	[0,4],*/
	null // lazy comma c/p
];

while (bingo.active && count != maxCount) {
	var p = Math.floor(Math.random() * Object.keys(bingo.players).length);
	var g = Math.floor(Math.random() * rules.size * rules.size);
	if (moves[count]) {
		p = moves[count][0];
		g = moves[count][1];
	}
	count++;
	console.log(p.toString() + " " + g.toString());

	if (rules.lockout && bingo.goals[g].isAchieved())
		continue;
	if (bingo.players[Object.keys(bingo.players)[p]].goalsAchieved.includes(g))
		continue;

	// console.log("achieve");
	bingo.players[Object.keys(bingo.players)[p]].achieveGoal(g);
	// console.log("add");
	bingo.goals[g].addAchiever(bingo.players[Object.keys(bingo.players)[p]].toString());
	// console.log("checkwin");
	bingo.checkWinStatus(Object.keys(bingo.players)[p]);
	console.log(bingo.winner);
}


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('testbingo', { title: 'Test', boardData: bingo.getBoardData() });
});

module.exports = router;
