var $ = require('jQuery');
var getJSON = require('get-json');
var goal = require('./goal');

var levels = require('./levels');
var constants = require('./constants');

/*

options:

bingo rules
size dropdown: 3x3, 5x5
checkbox on lockout
win condition checks?:
first to x
majority (default)
checkbox bingo (dropdown 1 to 5)

save file: newgame, newgameplus
checkbox on allow requiring characters
checkbox off include difficults (long if new game)
checkbox off include tutorials (maybe always exclude)
checkbox on include apples

time preference? short vs long


*/


// move somewhere
// var replays = require("src/replays.js");
// replays(checkReplay);


var Bingo = function(session, ruleset) {
	console.log(ruleset);
	var self = this;
	self.session = session;
	self.ruleset = ruleset;

	self.active = false;
	self.winner = "";

	self.players = {};
	self.goals = goal.makeGoals(ruleset);
	self.possibleBingos = self.cachePossibleBingos();

	self.cachePossibleBingos = function() {
		var sets = [];
		var cells;
		for (var i = 0; i < ruleset.size; i++) {
			// column i
			cells = [];
			for (var c = 0; c < ruleset.size; c++) {
				cells.push(c * ruleset.size + i);
			}
			sets.push(cells);

			// row i
			cells = [];
			for (var c = 0; c < ruleset.size; c++) {
				cells.push(i * ruleset.size + c);
			}
			sets.push(cells);
		}

		// diagonals
		cells = [];
		for (var i = 0; i < ruleset.size; i++) {
			cells.push(ruleset.size * i + i);
		}
		sets.push(cells);

		// diagonal tr-bl
		cells = [];
		for (var i = 0; i < ruleset.size; i++) {
			cells.push((ruleset.size - i) * (i + 1));
		}
		sets.push(cells);

		return sets;
	};


	self.add_player = function(id, name) {
		self.players[id] = new Player(id, name);
	};

	self.remove_player = function(id) {
		delete self.players[id];
		self.checkPlayersReady();
	};

	self.checkPlayersReady = function() {
		var count = 0;
		for (var p in players) {
			if (players[p].getReady())
				count++;
		}
		self.session.canStart(count > 1)
	};

	self.ready = function(id) {
		self.players[id].setReady(true);
		self.checkPlayersReady();
	};

	self.unready = function(id) {
		self.players[id].setReady(false);
		self.checkPlayersReady();
	};

	self.playerCountBingo = function(id) {
		var bingoCount = 0;
		for (var b in self.possibleBingos) {
			var hasBingo = true;
			for (var c in self.possibleBingos[b]) {
				if (!$.inArray(c, self.players[id].goalsAchieved)) {
					hasBingo = false;
					break;
				}
			}
			if (hasBingo)
				bingoCount++;
		}
		return bingoCount;
	};

	self.playerPossibleBingo = function(id) {
		var bingoCount = 0;
		for (var b in self.possibleBingos) {
			var blocked = false;
			for (var c in self.possibleBingos[b]) {
				if (self.goals[c].isAchieved() || !$.inArray(c, self.players[id].goalsAchieved)) {
					blocked = true;
					break;
				}
			}
			if (!blocked)
				bingoCount++;
		}
		return bingoCount;
	};

	self.isBingoCountPossible = function() {
		if (!ruleset.lockout)
			return true;

		return false;
		// return true if any player can achieve ruleset.bingo_count
	};

	self.countGoalsAchieved = function() {
		var goalsAchieved = 0;
		for (var g in self.goals) {
			if (g.isAchieved())
				goalsAchieved++;
		}
		return goalsAchieved;
	};

	self.checkWinStatus = function(id) {
		var isWinner = false;

		if (self.ruleset.bingo_count_type == "bingo") {
			if (playerCountBingo(id) >= self.ruleset.bingo_count) {
				self.winner = self.players[id].toString();
			} else if (!self.isBingoCountPossible()) {
				// tiebreak winner = most bingos then most goals
				// force win if tied bingos possible: 1st > 2nd + remaining
				var goalsRemaining = self.goals.length - self.countGoalsAchieved();
				var topPlayer = 0;
				var pg1 = 0;
				var pg2 = 0;
				for (var p in self.players) {
					if (self.players[p].goalsAchieved.length > pg1) {
						pg2 = pg1;
						pg1 = self.players[p].goalsAchieved.length;
					} else if (self.players[p].goalsAchieved.length > pg2) {
						pg2 = self.players[p].goalsAchieved.length;
					}
				}
				if (goalsRemaining < pg1 - pg2) { // impossible for another player to win
					self.winner = self.players[topPlayer].toString();
				}
			}
		} else { // count player goals
			if (self.players[id].goalsAchieved.length >= self.ruleset.bingo_count) {
				self.winner = self.players[id].toString();
			}
		}

		if (self.winner) {
			self.finish();
		}
	};

	self.start = function() {
		self.active = true;

		// remove not ready players
		var playersToRemove = [];
		for (var p in self.players) {
			if (!self.players[p].getReady()) {
				playersToRemove.push(p);
			}
		}
		for (var i = 0; i < playersToRemove.length; i++) {
			delete self.players[playersToRemove[i]];
		}
	};

	self.checkReplay = function(replay) {
		if (!self.active)
			return false;

		// validate
		if (replay.meta.validated < 1)
			return false; // doesn't handle early exit

		// in players
		if (!(replay.meta.user in self.players))
			return false;

		// in levels
		if (!levels.levels[replay.meta.levelname])
			return false;
		if (levels.levels[replay.meta.levelname].hub == "Tutorial" && !self.ruleset.tutorials)
			return false;
		if (levels.levels[replay.meta.levelname].hub == "Difficult" && !self.ruleset.difficults)
			return false;

		self.players[replay.meta.user].addProgress(replay);

		var success = false;
		for (var i = 0; i < goals.length; i++) {
			if (self.ruleset.lockout && goals[i].isAchieved()) {
				continue;
			} else if (goals[i].compareReplay(replay, self.players[replay.meta.user])) {
				self.goals[i].achieve(replay.meta.username);
				self.players[replay.meta.user].achieveGoal(i);
				success = true;
			}
		}

		if (success) {
			self.checkWinStatus(replay.meta.user);
			self.session.updateBoard(self.getBoardData());
		}
		return true;
	};

	self.getBoardData = function() {
		var boardData = {};

		boardData.size = self.ruleset.size;
		boardData.winner = self.winner;

		boardData.players = {};
		for (var id in self.players) {
			boardData.players[id] = self.players[id].getBoardData();
		}

		boardData.goals = {};
		for (var i = 0; i < self.goals.length; i++) {
			boardData.goals[i] = self.goals[i].getBoardData();
		}

		return JSON.stringify(boardData);
	};

	self.finish = function() {
		self.active = false;
		self.session.finish();
	};


	return self;
};

module.exports = Bingo;