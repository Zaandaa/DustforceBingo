var getJSON = require('get-json');
var goal = require('./goal');
var Player = require('./player');

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

function cachePossibleBingos(ruleset) {
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
		cells.push(ruleset.size * (i + 1) - i - 1);
	}
	sets.push(cells);

	return sets;
};

var Bingo = function(session, ruleset) {
	// console.log(ruleset);
	var self = this;
	self.session = session;
	self.ruleset = ruleset;

	self.active = false;
	self.winner = "";

	self.players = {};
	self.goals = goal.makeGoals(ruleset);
	self.possibleBingos = cachePossibleBingos(ruleset);


	self.add_player = function(id, name) {
		if (!self.active)
			self.players[id] = new Player(id, name);
	};

	self.remove_player = function(id) {
		if (!self.active) {
			delete self.players[id];
			self.checkPlayersReady();
		}
	};

	self.checkPlayersReady = function() {
		var count = 0;
		for (var p in self.players) {
			if (self.players[p].getReady())
				count++;
		}
		self.session.canStart(count > 1)
	};

	self.ready = function(id) {
		if (!self.active) {
			self.players[id].setReady(true);
			self.checkPlayersReady();
		}
	};

	self.unready = function(id) {
		if (!self.active) {
			self.players[id].setReady(false);
			self.checkPlayersReady();
		}
	};

	self.playerCountBingo = function(id) {
		var bingoCount = 0;
		for (var b in self.possibleBingos) {
			var hasBingo = true;
			for (var c in self.possibleBingos[b]) {
				if (!self.players[id].goalsAchieved.includes(self.possibleBingos[b][c])) {
					hasBingo = false;
					break;
				}
			}
			if (hasBingo)
				bingoCount++;
		}
		return bingoCount;
	};

	self.playerMaxBingo = function(id) {
		if (!self.ruleset.lockout)
			return self.possibleBingos.length;

		var bingoCount = 0;
		for (var b in self.possibleBingos) {
			var blocked = false;
			for (var c in self.possibleBingos[b]) {
				if (self.goals[self.possibleBingos[b][c]].isAchieved() && !self.players[id].goalsAchieved.includes(self.possibleBingos[b][c])) {
					blocked = true;
					break;
				}
			}
			if (!blocked)
				bingoCount++;
		}
		return bingoCount;
	};

	self.countGoalsAchieved = function() {
		var goalsAchieved = 0;
		for (var g in self.goals) {
			if (self.goals[g].isAchieved())
				goalsAchieved++;
		}
		return goalsAchieved;
	};

	self.setPlayersCanWin = function() {
		if (!self.ruleset.lockout)
			return;

		// update values
		var goalsRemaining = self.goals.length - self.countGoalsAchieved();
		var topGoals = 0;
		var topBingos = 0;
		var topBingosGoals = 0;
		for (var p in self.players) {
			self.players[p].maxGoals = self.players[p].goalsAchieved.length + goalsRemaining;
			self.players[p].bingos = self.playerCountBingo(p);
			self.players[p].maxBingos = self.playerMaxBingo(p);

			if (self.players[p].goalsAchieved.length > topGoals)
				topGoals = self.players[p].goalsAchieved.length;
			if (self.players[p].bingos >= topBingos) {
				topBingos = self.players[p].bingos;
				if (self.players[p].goalsAchieved.length > topBingosGoals)
					topBingosGoals = self.players[p].goalsAchieved.length;
			}
		}

		// can win checks
		for (var p in self.players) {
			if (!self.players[p].canWin)
				continue;

			if (self.ruleset.bingo_count_type == "bingo") {
				if (self.players[p].maxBingos < topBingos)
					self.players[p].canWin = false;
				else if (self.players[p].maxBingos == topBingos && self.players[p].maxGoals < topBingosGoals)
					self.players[p].canWin = false;
			} else {
				if (self.players[p].maxGoals < topGoals)
					self.players[p].canWin = false;
			}
		}
	}

	self.checkWinStatus = function(id) {
		if (self.winner != "")
			return;

		if (self.ruleset.bingo_count_type == "bingo") {
			if (self.playerCountBingo(id) >= self.ruleset.bingo_count) {
				self.winner = self.players[id].toString();
			}
		} else { // count player goals
			if (self.players[id].goalsAchieved.length >= self.ruleset.bingo_count) {
				self.winner = self.players[id].toString();
			}
		}
		if (self.winner == "" && self.ruleset.lockout) {
			self.setPlayersCanWin();
			var goalsRemaining = self.goals.length - self.countGoalsAchieved();

			var possibleWinners = [];
			for (var p in self.players) {
				if (self.players[p].canWin)
					possibleWinners.push(self.players[p].toString());
			}
			if (possibleWinners.length == 1 || goalsRemaining == 0) {
				self.winner = possibleWinners.join(" ");
			}
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
			if (self.ruleset.lockout && goals[i].isAchieved() || self.players[replay.meta.user].goalsAchieved.includes(i)) {
				continue;
			} else if (goals[i].compareReplay(replay, self.players[replay.meta.user])) {
				self.goals[i].addAchiever(replay.meta.username);
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