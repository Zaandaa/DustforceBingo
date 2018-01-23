var express = require('express');
var router = express.Router();
var Bingo = require('../src/bingo');

var consoleLogTest = true;
var simulatePlay = false;

var seedChars = "1234567890qwertyuiopasdfghjklzxcvbnm";
var seedLength = 8;
var seed = "";
for (var i = 0; i < seedLength; i++) {
	seed += seedChars.charAt(Math.floor(Math.random() * seedChars.length));
}
// seed = "custom";

var rules = {
	seed: seed,
	save: "New Game",
	size: 5,
	lockout: true,
	bingo_count: 2,
	bingo_count_type: "bingo",
	difficulty: 3, // 4 easy, 1 very hard
	length: 3, // 4 fast, 1 full game
	beat: true,
	ss: true,
	keys: true,
	characters: true,
	apples: false,
	tutorials: false,
	difficults: false,
	yottass: false,
	sfinesse: false,
	scomplete: false,
	bcomplete: false,
	dcomplete: false,
	nosuper: false,
	genocide: false,
	unload: false,
	lowdash: false,
	lowjump: false,
	lowattack: false,
	lowdirection: false
};

// simplified session for testing
var fakeSession = {
	canStart: function(a) {},
	removedPlayerOnStart: function(a) {},
	updateBoard: function(a) {},
	updatePlayers: function(a) {},
	playerFinish: function(a) {},
	resetBingo: function() {},
	finish: function() {}
}

if (consoleLogTest)
	console.log("Making test bingo")
var bingo = new Bingo(fakeSession, rules);
if (consoleLogTest)
	console.log("Done")

// add players
bingo.addPlayer(10,"--"); bingo.ready(10);
bingo.addPlayer(11,"OO"); bingo.ready(11);
bingo.addPlayer(1.5,"P1.5"); // not ready, should get removed
bingo.addPlayer(12,"P2.5"); bingo.removePlayer(12); // remove
bingo.addPlayer(22,"||"); bingo.ready(22);
bingo.start();
// bingo.voteReset(11);
// bingo.voteReset(22);
// bingo.resetBingo();

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

if (simulatePlay) {
	if (consoleLogTest)
		console.log("Test bingo start simulation")
	while (!bingo.isWon && count != maxCount) {
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
		bingo.checkPlayerFinished(Object.keys(bingo.players)[p]);
		if (rules.lockout)
			bingo.checkLockout();

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
	if (consoleLogTest)
		console.log("Test bingo completed simulation")
}

// bingo.resetBingo();


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('testbingo', { title: 'Test', boardData: JSON.stringify(bingo.getBoardData()) });
});

module.exports = router;
