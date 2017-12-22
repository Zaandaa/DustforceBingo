var express = require('express');
var router = express.Router();
var Bingo = require('../src/bingo');

var consoleLogTest = false;

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
	bingo_count: 2,
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
bingo.add_player(10,"--"); bingo.ready(10);
bingo.add_player(11,"OO"); bingo.ready(11);
// bingo.add_player(1.5,"P1.5"); // not ready, should get removed
bingo.add_player(22,"||"); bingo.ready(22);
bingo.start();

var count = 0;
var maxCount = -1; // -1 infinite

var moves = [ // move "pairs": player, goal
	// [0,0],
	// [0,1],
	// [0,2],
	// [0,3],
	// [0,4],
	// [1,5],
	// [1,6],
	// [1,7],
	// [1,8],
	// [1,9],
	// [0,10],
	// [1,11],
	// [0,12],
	// [1,13],
	// [0,14],
	// [1,15],
	// [0,16],
	// [1,17],
	// [0,18],
	// [1,19],
	// [0,20],
	// [1,21],
	// [0,22],
	// [1,23],
	// [0,24],
	null // lazy comma c/p
];

while (bingo.winner == "" && count != maxCount) {
	var p = Math.floor(Math.random() * Object.keys(bingo.players).length);
	var g = Math.floor(Math.random() * rules.size * rules.size);
	if (moves[count]) {
		p = moves[count][0];
		g = moves[count][1];
	}
	count++;
	// console.log(p.toString() + " " + g.toString());

	if (rules.lockout && bingo.goals[g].isAchieved())
		continue;
	if (bingo.players[Object.keys(bingo.players)[p]].goalsAchieved.includes(g))
		continue;

	if (consoleLogTest)
		console.log(p.toString() + " " + g.toString());

	// console.log("achieve");
	bingo.players[Object.keys(bingo.players)[p]].achieveGoal(g);
	// console.log("add");
	bingo.goals[g].addAchiever(bingo.players[Object.keys(bingo.players)[p]].toString());
	// console.log("checkwin");
	bingo.checkWinStatus(Object.keys(bingo.players)[p]);

	// console board
	if (consoleLogTest) {
		console.log("winner: " + bingo.winner);
		for (var r = 0; r < rules.size; r++) {
			var line = "";
			for (var c = 0; c < rules.size; c++) {
				line += " " + (bingo.goals[r * rules.size + c].isAchieved() ? bingo.goals[r * rules.size + c].achieved[0] : "  ");
			}
			console.log(line);
		}
		console.log("");
	}
}


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('testbingo', { title: 'Test', boardData: bingo.getBoardData() });
});

module.exports = router;
