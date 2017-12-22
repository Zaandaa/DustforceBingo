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
		if (!ruleset.lockout)
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

	self.checkWinStatus = function(id) {
		var isWinner = false;

		if (self.ruleset.bingo_count_type == "bingo") {
			if (self.playerCountBingo(id) >= self.ruleset.bingo_count) {
				self.winner = self.players[id].toString();
			} else {
				// resolve winner: most bingos then most goals
				var goalsRemaining = self.goals.length - self.countGoalsAchieved();
				var topPlayersBingos = [];
				var pTopBingos1 = 0;
				var pTopBingos2 = 0;
				var pMaxBingos1 = 0;
				var pMaxBingos2 = 0;
				for (var p in self.players) {
					var b = self.playerCountBingo(p);
					if (b > pTopBingos1) {
						topPlayersBingos = [self.players[p].toString()];
						pTopBingos2 = pTopBingos1;
						pTopBingos1 = b;
					} else if (b == pTopBingos1) {
						topPlayersBingos.push(self.players[p].toString());
						pTopBingos2 = b;
					} else if (b > pTopBingos2) {
						pTopBingos2 = b;
					}

					var m = self.playerMaxBingo(p);
					if (m > pMaxBingos1) {
						pMaxBingos2 = pMaxBingos1;
						pMaxBingos1 = m;
					} else if (m > pMaxBingos2) {
						pMaxBingos2 = m;
					}
				}

				// check forced win
				if (pTopBingos1 > pMaxBingos2 && pMaxBingos2 < ruleset.bingo_count) {
					self.winner = topPlayersBingos.join(" ");
				}

				// check forced bingo count tie
				if (pTopBingos1 == pTopBingos2 && pTopBingos1 == pMaxBingos1) { 
					var topPlayersGoals = [];
					var pTopGoals1 = 0;
					var pTopGoals2 = 0;
					for (var p in self.players) {
						if (!topPlayersBingos.includes(self.players[p].toString()))
							continue;

						if (self.players[p].goalsAchieved.length > pTopGoals1) {
							topPlayersGoals = [self.players[p].toString()];
							pTopGoals2 = pTopGoals1;
							pTopGoals1 = self.players[p].goalsAchieved.length;
						} else if (self.players[p].goalsAchieved.length == pTopGoals1) {
							topPlayersGoals.push(self.players[p].toString());
							pTopGoals2 = self.players[p].goalsAchieved.length;
						} else if (self.players[p].goalsAchieved.length > pTopGoals2) {
							pTopGoals2 = self.players[p].goalsAchieved.length;
						}
					}

					if (goalsRemaining < pTopGoals1 - pTopGoals2) { // impossible for another player to win
						self.winner = topPlayersGoals.join(" ");
					} else if (goalsRemaining == 0) {
						self.winner = topPlayersGoals.join(" ");
					}
				}
			}
		} else { // count player goals
			if (self.players[id].goalsAchieved.length >= self.ruleset.bingo_count) {
				self.winner = self.players[id].toString();
			} else if (ruleset.lockout) {
				// check if someone forces win
				var goalsRemaining = self.goals.length - self.countGoalsAchieved();
				var topPlayersGoals = [];
				var pTopGoals1 = 0;
				var pTopGoals2 = 0;
				for (var p in self.players) {
					if (self.players[p].goalsAchieved.length > pTopGoals1) {
						topPlayersGoals = [self.players[p].toString()];
						pTopGoals2 = pTopGoals1;
						pTopGoals1 = self.players[p].goalsAchieved.length;
					} else if (self.players[p].goalsAchieved.length == pTopGoals1) {
						topPlayersGoals.push(self.players[p].toString());
						pTopGoals2 = self.players[p].goalsAchieved.length;
					} else if (self.players[p].goalsAchieved.length > pTopGoals2) {
						pTopGoals2 = self.players[p].goalsAchieved.length;
					}
				}
				if (goalsRemaining < pTopGoals1 - pTopGoals2) { // impossible for another player to win
					self.winner = topPlayersGoals.join(" ");
				} else if (goalsRemaining == 0) {
					self.winner = topPlayersGoals.join(" ");
				}
			}
		}

		if (self.winner != "") {
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