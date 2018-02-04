var getJSON = require('get-json');
var board = require('./board');
var goal = require('./goal');
var Player = require('./player');

var levels = require('./levels');
var constants = require('./constants');
var options = require('./options');

var Bingo = function(session, ruleset) {
	// console.log("RULES", ruleset);
	var self = this;
	self.session = session;
	self.ruleset = ruleset;

	// translate ruleset
	self.ruleset.size = parseInt(self.ruleset.size, 10);
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
	self.teamsDone = 0;
	self.error = false;

	self.teams = {};
	self.players = {};

	self.possibleBingos = board.cachePossibleBingos(self.ruleset.size);
	self.goals = goal.makeGoals(self.ruleset, self.possibleBingos);

	if (self.ruleset.antibingo) {
		self.ruleset.lockout = false;
		self.ruleset.hidden = false;
		if (self.ruleset.bingo_count_type != "bingo") {
			self.ruleset.bingo_count_type = "bingo";
			self.ruleset.bingo_count = 1;
		}
	}

	self.error = "";
	if (self.goals.includes(undefined))
		self.error = "nobingo";
	else if (self.ruleset.size != 3 && self.ruleset.size != 4 && self.ruleset.size != 5)
		self.error = "nobingo";
	if (self.error != "")
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
		if (self.startTime > 0)
			return;
		if (id in self.players) {
			if (self.players[id].changeColor(color))
				self.session.updatePlayers();
		}
	};

	self.countBingo = function(id) {
		var bingoCount = 0;
		for (var b in self.possibleBingos) {
			if (self.ruleset.antibingo && !self.teams[id][0].goalBingos.includes(b))
				continue;
			var hasBingo = true;
			for (var c in self.possibleBingos[b]) {
				var teamHasCell = false;
				for (var p in self.teams[id]) {
					if (!self.players[self.teams[id][p]].goalsAchieved.includes(self.possibleBingos[b][c])) {
						teamHasCell = true;
						break;
					}
				}
				if (!teamHasCell)
					hasBingo = false;
					break;
				}
			}
			if (hasBingo)
				bingoCount++;
		}
		return bingoCount;
	};

	self.countMaxBingo = function(id) {
		if (!self.ruleset.lockout)
			return self.possibleBingos.length;

		var bingoCount = 0;
		for (var b in self.possibleBingos) {
			var blocked = false;
			for (var c in self.possibleBingos[b]) {
				if (self.goals[self.possibleBingos[b][c]].isAchieved()) {
					var teamHasCell = false;
					for (var p in self.teams[id]) {
						if (self.players[self.teams[id][p]].goalsAchieved.includes(self.possibleBingos[b][c])) {
							teamHasCell = true;
							break;
						}
					}
					if (!teamHasCell) {
						blocked = true;
						break;
					}
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

	self.countTeamGoals = function(id) {
		var teamGoals = [];
		for (var p in self.teams[id]) {
			self.players[self.teams[id][p]].goalsAchieved.forEach(function(g) {
				if (!teamGoals.includes(g))
					teamGoals.push(g);
			});
		}
		return teamGoals.length;
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
			var teamGoals = self.countTeamGoals(self.players[p].team);
			var teamBingos = self.countBingo(self.players[p].team);
			var teamMaxBingos = self.countMaxBingo(self.players[p].team);
			self.players[p].maxGoals = teamGoals + goalsRemaining;
			self.players[p].bingos = teamBingos;
			self.players[p].maxBingos = teamMaxBingos;

			if (teamGoals > topGoals)
				topGoals = teamGoals;
			if (teamBingos >= topBingos) {
				topBingos = teamBingos;
				if (teamGoals > topBingosGoals)
					topBingosGoals = teamGoals;
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
				if (self.players[p].canWin && !possibleWinners.includes(self.players[p].team))
					possibleWinners.push(self.players[p].team);
			}
		}

		if (goalsRemaining == 0) {
			// force end
			self.isWon = true;
			var rankedTeams = {};
			for (var p in self.players) {
				if (self.players[p].finishTime > 0)
					continue;
				else if (possibleWinners.includes[self.players[p].team]) { // tie win, not already done
					self.players[p].finish(Date.now() - self.startTime, true, 1);
				} else if (!rankedTeams.includes(self.players[p].team)) {
					var score = self.players[p].goalsAchieved.length + (self.ruleset.bingo_count_type == "bingo" ? self.players[p].bingos * 100 : 0);
					if (!rankedTeams[score])
						rankedTeams[score] = [];
					rankedTeams[score].push(self.players[p].team);
				}
			}
			self.teamsDone += possibleWinners.length;

			var sortedRanks = Object.keys(rankedPlayers).slice();
			sortedRanks.sort(function(a,b) { return b-a; });
			for (var score in sortedRanks) {
				for (var t in rankedTeams[sortedRanks[score]]) {
					self.teams[rankedTeams[sortedRanks[score]]].forEach(function(player) {
						player.finish(Date.now() - self.startTime, false, self.teamsDone + 1);
					});
				}
				self.teamsDone += rankedTeams[sortedRanks[score]].length;
			}

		} else if (possibleWinners.length == 1) {
			// force win
			self.isWon = true;
			self.teams[possibleWinners[0]].forEach(function(player) {
				player.finish(Date.now() - self.startTime, true, self.teamsDone + 1);
			});
			self.teamsDone++;
		}
	};

	self.checkFinished = function(id) {
		if (self.teams[id][0].finishTime > 0)
			return; // already done

		if (self.ruleset.bingo_count_type == "bingo") {
			if (self.countBingo(id) >= self.ruleset.bingo_count) {
				for (var p in self.teams[id]) {
					self.players[self.teams[id][p]].finish(Date.now() - self.startTime, !self.isWon, self.teamsDone + 1);
					self.isWon = true;
				}
				self.teamsDone++;
			}
		} else { // count player goals
			if (self.countTeamGoals(id) >= self.ruleset.bingo_count) {
				for (var p in self.teams[id]) {
					self.players[self.teams[id][p]].finish(Date.now() - self.startTime, !self.isWon, self.teamsDone + 1);
					self.isWon = true;
				}
				self.teamsDone++;
			}
		}
	};

	self.countProgress = function(goalData, team) {
		// var progress = ;
		for (var p in self.teams[team]) {
			self.players[self.teams[team][t]].allProgress
		}
	};

	self.revealGoalNeighbors = function(i) {
		if (i >= self.ruleset.size) { // not top, reveal above
			self.goals[i - self.ruleset.size].reveal();
		}
		if (i < self.ruleset.size * self.ruleset.size - self.ruleset.size) { // not bottom, reveal below
			self.goals[i + self.ruleset.size].reveal();
		}
		if (i % self.ruleset.size > 0) { // not left, reveal left
			self.goals[i - 1].reveal();
		}
		if (i % self.ruleset.size < self.ruleset.size - 1) { // not right, reveal right
			self.goals[i + 1].reveal();
		}
	};

	self.assignAnti = function(p, a) {
		if (!self.ruleset.antibingo)
			return;
		if (self.players[p].assignedAnti.length < self.ruleset.bingo_count && !self.players[p].assignedAnti.includes(a)) {
			self.players[p].giveAnti(a);
			// other player.receiveAnti(a);
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
		self.teamsDone = 0;

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

		// make teams
		for (var p in self.players) {
			var team = self.ruleset.teams ? self.players[p].color : p;
			self.players[p].team = team;
			if (team in self.teams)
				self.teams[team].push(p);
			else
				self.teams[team] = [p];
		}

		// reveal if needed
		if (!ruleset.hidden) {
			for (var i = 0; i < self.goals.length; i++) {
				self.goals[i].reveal();
			}
		} else { // middle
			if (self.ruleset.size % 2 == 0)
				self.goals[self.ruleset.size + self.ruleset.size / 2 - 1].reveal();
			else
				self.goals[Math.floor(self.ruleset.size * self.ruleset.size / 2)].reveal();
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
				if (!self.ruleset.minecraft)
					return false;
			} else if (replay.validated == -8) {
				if (!self.ruleset.boss)
					return false;
			} else if (replay.validated == -9) {
				if (!self.ruleset.unload)
					return false;
			} else if (replay.validated == -10) {
				if (!self.ruleset.someplugin)
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
				if (self.ruleset.hidden)
					self.revealGoalNeighbors(i);
				// console.log("GOAL ACHIEVED", i, replay.username);
			}
		}

		if (success) {
			self.firstGoal = true;
			self.checkFinished(self.players[replay.user].team);
			if (self.ruleset.hidden && self.teamsDone >= Object.keys(self.players).length) {
				for (var g in self.goals) {
					self.goals[g].reveal();
				}
			}
			if (self.ruleset.lockout)
				self.checkLockout();
			self.session.updateBoard();
			self.session.updatePlayers();
			self.checkAllGoalsComplete();
		}
		return true;
	};

	self.getBoardData = function(player) {
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
				if (self.goals[i].goalData.type == "total" && player in self.players)
					boardData.goals[i].progress = Math.min(self.players[player].countObjective(self.goals[i].goalData), self.goals[i].goalData.total);
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
		enabled = []
		for (var o in options) {
			if (self.ruleset[o])
				enabled.push(o);
		}
		return enabled;
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
		self.teamsDone = 0;

		// unready all
		for (var p in self.players) {
			self.players[p].resetVars();
		}
		self.teams = {};

		// new goals
		self.goals = goal.makeGoals(self.ruleset, self.possibleBingos);

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
		delete self.teams;

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