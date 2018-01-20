var getJSON = require('get-json');
var board = require('./board');
var goal = require('./goal');
var Player = require('./player');

var levels = require('./levels');
var constants = require('./constants');


var Bingo = function(session, ruleset) {
	// console.log("RULES", ruleset);
	var self = this;
	self.session = session;
	self.ruleset = ruleset;

	// translate ruleset
	for (var r in self.ruleset) {
		if (self.ruleset[r] == "true")
			self.ruleset[r] = true;
		if (self.ruleset[r] == "false")
			self.ruleset[r] = false;
	}
	switch (self.ruleset.difficulty_raw) {
		case "Easy": self.ruleset.difficulty = 4; break;
		case "Normal": self.ruleset.difficulty = 3; break;
		case "Hard": self.ruleset.difficulty = 2; break;
		case "Very Hard": self.ruleset.difficulty = 1; break;
	}
	switch (self.ruleset.length_raw) {
		case "Fast": self.ruleset.length = 4; break;
		case "Normal": self.ruleset.length = 3; break;
		case "Long": self.ruleset.length = 2; break;
		case "Full Game": self.ruleset.length = 1; break;
	}
	self.ruleset.maxEasy = self.ruleset.difficulty + 4;

	self.active = false;
	self.startTime = 0;
	self.firstGoal = false;
	self.isWon = false;
	self.finished = false;
	self.playersDone = 0;
	self.error = false;

	self.players = {};
	self.possibleBingos = board.cachePossibleBingos(ruleset.size);
	self.goals = goal.makeGoals(ruleset, self.possibleBingos);

	self.error = self.goals.includes(undefined);
	if (self.error)
		return self;

	self.getState = function() {
		var s;
		if (self.isWon)
			s = "Complete";
		else if (self.active)
			s = "In progress";
		else
			s = "Open";
		return s;
	};

	self.getStatus = function() {
		var playerNames = [];
		for (var p in self.players) {
			playerNames.push(self.players[p].name);
		}

		return {
			status: self.getState(),
			players: playerNames,
		}
	};

	self.addPlayer = function(id, name) {
		if (!self.active && !(id in self.players) && Object.keys(self.players).length < 10) {
			self.players[id] = new Player(id, name);
			self.session.updatePlayers();
			return true;
		}
		return false;
	};

	self.removePlayer = function(id) {
		if (!self.active && id in self.players) {
			delete self.players[id];
			self.checkPlayersReady();
			self.session.updatePlayers();
			return true;
		}
		return false;
	};

	self.checkPlayersReady = function() {
		var ready = false;
		for (var p in self.players) {
			if (self.players[p].getReady()) {
				ready = true;
				break;
			}
		}
		self.session.canStart(ready);
	};

	self.ready = function(id) {
		if (!self.active && id in self.players) {
			self.players[id].setReady(true);
			self.checkPlayersReady();
			self.session.updatePlayers();
		}
	};

	self.unready = function(id) {
		if (!self.active && id in self.players) {
			self.players[id].setReady(false);
			self.checkPlayersReady();
			self.session.updatePlayers();
		}
	};

	self.voteReset = function(id) {
		if (((self.active && !self.firstGoal) || self.isWon) && id in self.players) {
			self.players[id].voteReset(true);
			self.resetBingo();
			self.session.updatePlayers();
		}
	};

	self.checkReset = function() {
		var needToReset = Object.keys(self.players).length == 1 ? 1 : 2;
		var count = 0;
		for (var p in self.players) {
			if (self.players[p].reset)
				count++;
		}
		return count >= needToReset && ((self.active && !self.firstGoal) || self.isWon);
	};

	self.changePlayerColor = function(id, color) {
		if (id in self.players) {
			if (self.players[id].changeColor(color))
				self.session.updatePlayers();
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

	self.checkLockout = function(id) {
		self.setPlayersCanWin();

		if (Object.keys(self.players).length == 1)
			return;

		var goalsRemaining = self.goals.length - self.countGoalsAchieved();

		var possibleWinners = [];
		if (!self.isWon) {
			for (var p in self.players) {
				if (self.players[p].canWin)
					possibleWinners.push(p);
			}
		}

		if (goalsRemaining == 0) {
			// force end
			for (var p in self.players) {
				var winner = possibleWinners.includes[p]
				if (self.players[p].finishTime == 0)
					self.players[p].finish(Date.now() - self.startTime, winner, self.playersDone + 1);
				if (winner)
					self.session.playerFinish(p);
			}
		} else if (possibleWinners.length == 1) {
			// force win
			self.isWon = true;
			self.players[possibleWinners[0]].finish(Date.now() - self.startTime, true, self.playersDone + 1);
			self.session.playerFinish(possibleWinners[0]);
			self.playersDone++;
		}
	};

	self.checkPlayerFinished = function(id) {
		if (self.players[id].finishTime > 0)
			return; // already done

		if (self.ruleset.bingo_count_type == "bingo") {
			if (self.playerCountBingo(id) >= self.ruleset.bingo_count) {
				self.players[id].finish(Date.now() - self.startTime, !self.isWon, self.playersDone + 1);
				self.session.playerFinish(id);
				self.isWon = true;
				self.playersDone++;
			}
		} else { // count player goals
			if (self.players[id].goalsAchieved.length >= self.ruleset.bingo_count) {
				self.players[id].finish(Date.now() - self.startTime, !self.isWon, self.playersDone + 1);
				self.session.playerFinish(id);
				self.isWon = true;
				self.playersDone++;
			}
		}
	};

	self.start = function() {
		var ready = false;
		for (var p in self.players) {
			if (self.players[p].getReady()) {
				ready = true;
				break;
			}
		}
		if (!ready)
			return;

		self.active = true;
		self.firstGoal = false;
		self.isWon = false;
		self.finished = false;
		self.playersDone = 0;

		// remove not ready players
		var playersToRemove = [];
		for (var p in self.players) {
			self.players[p].voteReset(false);
			if (!self.players[p].getReady()) {
				playersToRemove.push(p);
			}
		}
		for (var i = 0; i < playersToRemove.length; i++) {
			delete self.players[playersToRemove[i]];
			self.session.removedPlayerOnStart(playersToRemove[i]);
		}

		self.startTime = Date.now();

		self.session.updateBoard();
		self.session.updatePlayers();
	};

	self.checkAllGoalsComplete = function() {
		if (self.countGoalsAchieved() == self.goals.length) {
			if (self.ruleset.lockout) {
				self.finish();
			} else {
				for (var p in self.players) {
					if (self.players[p].goalsAchieved.length == self.goals.length)
						return;
				}
				self.finish();
			}
		}
	};

	self.sendReplay = function(replay) {
		if (!self.active)
			return false;

		// validate
		if (replay.validated < 1 && replay.validated != -3) {
			if (replay.validated == -7) {
				if (!ruleset.minecraft)
					return false;
			} else if (replay.validated == -8) {
				if (!ruleset.boss)
					return false;
			} else if (replay.validated == -9) {
				if (!ruleset.unload)
					return false;
			} else if (replay.validated == -10) {
				if (!ruleset.someplugin)
					return false;
			} else
				return false;
		}

		// in players
		if (!(replay.user in self.players))
			return false;

		// in levels
		if (!levels.levels[replay.levelname])
			return false;
		if (levels.levels[replay.levelname].hub == "Tutorial" && !self.ruleset.tutorials)
			return false;
		if (levels.levels[replay.levelname].hub == "Difficult" && !self.ruleset.difficults)
			return false;

		self.players[replay.user].addProgress(replay);

		var success = false;
		for (var i = 0; i < self.goals.length; i++) {
			if (self.ruleset.lockout && self.goals[i].isAchieved() || self.players[replay.user].goalsAchieved.includes(i)) {
				continue;
			} else if (self.goals[i].compareReplay(replay, self.players[replay.user])) {
				self.goals[i].addAchiever(replay.user);
				self.players[replay.user].achieveGoal(i);
				success = true;
				// console.log("GOAL ACHIEVED", i, replay.username);
			}
		}

		if (success) {
			self.firstGoal = true;
			self.checkPlayerFinished(replay.user);
			if (self.ruleset.lockout)
				self.checkLockout();
			self.session.updateBoard();
			self.session.updatePlayers();
			self.checkAllGoalsComplete();
		}
		return true;
	};

	self.getBoardData = function() {
		var boardData = {};

		if (self.active || self.finished) {
			boardData.state = self.getState();
			boardData.firstGoal = self.firstGoal;
			boardData.size = self.ruleset.size;

			boardData.players = {};
			for (var id in self.players) {
				boardData.players[id] = self.players[id].getBoardData();
			}

			boardData.goals = {};
			for (var i = 0; i < self.goals.length; i++) {
				boardData.goals[i] = self.goals[i].getBoardData();
			}
		}

		return boardData;
	};

	self.getPlayerData = function() {
		var playerData = {};

		playerData.players = [];
		for (var id in self.players) {
			playerData.players.push(self.players[id].getBoardData());
		}

		return playerData;
	};

	self.getGoalOptions = function() {
		options = []
		for (var o in constants.optionNames) {
			if (self.ruleset[o])
				options.push(constants.optionNames[o]);
		}
		return options.join(", ");
	};

	self.resetBingo = function() {
		if (!self.checkReset())
			return;

		// states
		self.active = false;
		self.startTime = 0;
		self.firstGoal = false;
		self.isWon = false;
		self.finished = false;
		self.playersDone = 0;

		// unready all
		for (var p in self.players) {
			self.players[p].resetVars();
		}

		// new goals
		self.goals = goal.makeGoals(ruleset);

		self.session.resetBingo();
	};

	self.finish = function() {
		self.active = false;
		self.finished = true;
		self.session.finish();
	};

	self.cleanup = function() {
		self.active = false;
		self.finished = true;

		for (var id in self.players) {
			delete self.players[id];
		}
		delete self.players;

		for (var g in self.goals) {
			delete self.goals[g];
		}
		delete self.goals;

		delete self.ruleset;
		delete self.session;

		delete self;
	}

	return self;
};

module.exports = Bingo;