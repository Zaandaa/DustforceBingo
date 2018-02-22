var express = require('express');
var router = express.Router();
var Bingo = require('../src/bingo');

var consoleLogTest = false;
var simulatePlay = true;
var continueAfterCount = true;

var seedChars = "1234567890qwertyuiopasdfghjklzxcvbnm";
var seedLength = 8;
var seed = "";
for (var i = 0; i < seedLength; i++) {
	seed += seedChars.charAt(Math.floor(Math.random() * seedChars.length));
}
// seed = "custom";

var rules = {
	gametype: "bingo",
	win_type: "totalarea",
	seed: seed,
	size: 3,
	newgame: true,
	newgame64: true,
	lockout: true,
	hidden: false,
	hidden64: false,
	teams: true,
	teams64: true,
	plugins: false,
	plugins64: false,
	antibingo: false,
	bingo_count: 6,
	bingo_count_type: "bingo",
	goal_count: 33,
	difficulty: 1, // 4 easy, 1 very hard
	length: 1, // 4 fast, 1 full game
	beat: true,
	ss: true,
	ss64: true,
	keys: true,
	multilevel: true,
	characters: true,
	apples: true,
	tutorials: true,
	difficults: true,
	yottass: true,
	sfinesse: true,
	scomplete: true,
	bcomplete: true,
	dcomplete: true,
	nosuper: true,
	genocide: true,
	unload: true,
	lowdash: true,
	lowjump: true,
	lowattack: true,
	lowdirection: true,
	shuffle: true,
	captureblank: true,
	captureother: true
};

// simplified session for testing
var fakeSession = {
	canStart: function(a) {},
	removedPlayerOnStart: function(a) {},
	updateBoard: function(a) {},
	updatePlayers: function(a) {},
	updateLog: function(a) {},
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
bingo.addPlayer(10,"-"); bingo.changePlayerColor(10, "-"); bingo.ready(10);
// bingo.addPlayer(11,"O"); bingo.ready(11);
// bingo.addPlayer(1.5,"1"); // not ready, should get removed
// bingo.addPlayer(12,"2"); bingo.removePlayer(12); // remove
bingo.addPlayer(22,"|"); bingo.changePlayerColor(22, "|"); bingo.ready(22);
bingo.start();
// bingo.assignAnti(10,{type: "row", value: 1});
// bingo.assignAnti(22,{type: "row", value: 1});
// bingo.voteReset(11);
// bingo.voteReset(22);
// bingo.resetBingo();

var count = 0;
var maxCount = -1; // -1 infinite

var moves = [ // move "pairs": player, goal
	// [0,1],
	// [0,8],
	// [0,10],
	// [1,9],
	// [0,16],
	// [0,18],
	// [0,25]
	// [0,0],
	// [0,1],
	// [0,2],
	// [0,3],
	// [0,4],
	// [1,5],
	// [1,6],
	// [1,7],
	// [1,8],
	// [1,9]
	[0,0],
	[1,1],
	[1,2],
	[1,3],
	[0,4],
	[0,5],
	[1,6],
	[0,7],
	[1,8]
];

if (simulatePlay) {
	if (consoleLogTest)
		console.log("Test bingo start simulation")

	if (rules.antibingo)
		bingo.antiForceAssign();

	while (!bingo.isWon && count != maxCount && !bingo.finished) {
		var p = Math.floor(Math.random() * Object.keys(bingo.players).length);
		var g = Math.floor(Math.random() * rules.size * rules.size);
		if (moves[count]) {
			p = moves[count][0];
			g = moves[count][1];
		} else if (!continueAfterCount)
			break;

		count++;
		// console.log(p.toString() + " " + g.toString());

		if (rules.lockout && bingo.getGoalTeam(g))
			continue;
		if (bingo.players[Object.keys(bingo.players)[p]].goalsAchieved.includes(g))
			continue;

		if (consoleLogTest)
			console.log(p.toString() + " " + g.toString());

		// console.log("achieve");
		bingo.teams[bingo.players[Object.keys(bingo.players)[p]].team].achieveGoal(g);
		bingo.players[Object.keys(bingo.players)[p]].achieveGoal(g);

		// console.log("add");
		bingo.goals[g].addAchiever(bingo.players[Object.keys(bingo.players)[p]].id);
		if (rules.gametype == "64") {
			bingo.checkCapture(g);
			bingo.updateTeamRegions();
		}

		// console.log("checkwin");
		bingo.checkFinished(bingo.players[Object.keys(bingo.players)[p]].team);
		if (bingo.ruleset.lockout)
			bingo.checkLockout();
		bingo.checkAllGoalsComplete();

		// console board
		if (consoleLogTest) {
			console.log("winner: " + bingo.isWon);
			for (var r = 0; r < rules.size; r++) {
				var line = "";
				for (var c = 0; c < rules.size; c++) {
					if (rules.gametype == "64") {
						line += " " + (bingo.getGoalTeam(r * rules.size + c) || " ");
					} else if (rules.lockout) {
						line += " " + (bingo.goals[r * rules.size + c].isAchieved() ? bingo.players[bingo.goals[r * rules.size + c].achieved[0]].name : " ");
					} else {
						line += " ";
						for (var i = 0; i < 2; i++) {
							line += bingo.goals[r * rules.size + c].achieved[i] ? bingo.players[bingo.goals[r * rules.size + c].achieved[i]].name : " ";
						}
						// line += " " + (bingo.goals[r * rules.size + c].isAchieved() ? bingo.goals[r * rules.size + c].achieved.join("") : "  ");
					}
				}
				console.log(line);
			}
			console.log("");

			// console.log(bingo.getPlayerData());
		}
	}
	if (consoleLogTest) {
		console.log("Test bingo completed simulation")
		console.log("finished:", bingo.finished);
		console.log("isWon:", bingo.isWon);
	}
}

// bingo.resetBingo();


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('testbingo', { title: 'Test', boardData: JSON.stringify(bingo.getBoardData()) });
});

module.exports = router;
