var getJSON = require('get-json');
var board = require('./board');
var goal = require('./goal');
var Team = require('./team');
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
		var antiUnassignedCount = 0;
		for (var b in self.possibleBingos) {
			var anti = false;
			if (self.ruleset.antibingo && !self.teams[id].goalBingos.includes(parseInt(b, 10)))
				anti = true;

			var hasBingo = true;
			for (var c in self.possibleBingos[b]) {
				if (!self.teams[id].goalsAchieved.includes(self.possibleBingos[b][c])) {
					hasBingo = false;
					break;
				}
			}

			if (hasBingo) {
				bingoCount++;
			}
			if (hasBingo && anti)
				antiUnassignedCount++;
		}

		if (self.ruleset.antibingo) {
			var maxUnassigned = self.teams[id].goalBingos.filter(function(x) {return x == -1;}).length;
			bingoCount -= antiUnassignedCount;
			bingoCount += Math.min(maxUnassigned, antiUnassignedCount);
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
				if (self.goals[self.possibleBingos[b][c]].isAchieved() && !self.teams[id].goalsAchieved.includes(self.possibleBingos[b][c])) {
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

	self.setTeamsCanWin = function() {
		if (!self.ruleset.lockout)
			return;

		// update values
		var goalsRemaining = self.goals.length - self.countGoalsAchieved();
		var topGoals = 0;
		var topBingos = 0;
		var topBingosGoals = 0;
		for (var t in self.teams) {
			var teamGoals = self.teams[t].goalsAchieved.length;
			var teamBingos = self.countBingo(t);
			var teamMaxBingos = self.countMaxBingo(t);
			self.teams[t].maxGoals = teamGoals + goalsRemaining;
			self.teams[t].bingos = teamBingos;
			self.teams[t].maxBingos = teamMaxBingos;

			if (teamGoals > topGoals)
				topGoals = teamGoals;
			if (teamBingos >= topBingos) {
				topBingos = teamBingos;
				if (teamGoals > topBingosGoals)
					topBingosGoals = teamGoals;
			}
		}

		// can win checks
		for (var t in self.teams) {
			if (!self.teams[t].canWin)
				continue;

			if (self.ruleset.bingo_count_type == "bingo") {
				if (self.teams[t].maxBingos < topBingos)
					self.teams[t].canWin = false;
				else if (self.teams[t].maxBingos == topBingos && self.teams[t].maxGoals < topBingosGoals)
					self.teams[t].canWin = false;
			} else {
				if (self.teams[t].maxGoals < topGoals)
					self.teams[t].canWin = false;
			}
		}
	}

	self.checkLockout = function(id) {
		self.setTeamsCanWin();

		if (Object.keys(self.teams).length == 1)
			return;

		var goalsRemaining = self.goals.length - self.countGoalsAchieved();

		var possibleWinners = [];
		if (!self.isWon) {
			for (var t in self.teams) {
				if (self.teams[t].canWin && !possibleWinners.includes(t))
					possibleWinners.push(t);
			}
		}

		if (goalsRemaining == 0) {
			// force end
			self.isWon = true;
			var rankedTeams = {}; // score: [t]
			for (var t in self.teams) {
				if (self.teams[t].finishTime > 0)
					continue;
				else if (possibleWinners.includes[t]) { // tie win, not already done
					self.teams[t].finish(Date.now() - self.startTime, true, 1);
				} else {
					var score = self.teams[t].goalsAchieved.length + (self.ruleset.bingo_count_type == "bingo" ? self.teams[t].bingos * 100 : 0);
					if (!rankedTeams[score])
						rankedTeams[score] = [];
					rankedTeams[score].push(t);
				}
			}
			self.teamsDone += possibleWinners.length;

			var sortedRanks = Object.keys(rankedTeams).slice();
			sortedRanks.sort(function(a,b) { return b-a; });
			for (var score in sortedRanks) {
				for (var t in rankedTeams[sortedRanks[score]]) {
					self.teams[rankedTeams[sortedRanks[score]][t]].finish(Date.now() - self.startTime, false, self.teamsDone + 1);
				}
				self.teamsDone += rankedTeams[sortedRanks[score]].length;
			}

		} else if (possibleWinners.length == 1) {
			// force win
			self.isWon = true;
			self.teams[possibleWinners[0]].finish(Date.now() - self.startTime, true, self.teamsDone + 1);
			self.teamsDone++;
		}
	};

	self.checkFinished = function(id) {
		if (self.teams[id].finishTime > 0)
			return; // already done

		if (self.ruleset.bingo_count_type == "bingo") {
			if (self.countBingo(id) >= self.ruleset.bingo_count) {
				self.teams[id].finish(Date.now() - self.startTime, !self.isWon, self.teamsDone + 1);
				self.isWon = true;
				self.teamsDone++;
			}
		} else { // count goals
			if (self.teams[id].goalsAchieved.length >= self.ruleset.bingo_count) {
				self.teams[id].finish(Date.now() - self.startTime, !self.isWon, self.teamsDone + 1);
				self.isWon = true;
				self.teamsDone++;
			}
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

	self.antiForceAssign = function() {
		for (var t in self.teams) {
			while (self.teams[t].assignedAnti.length < self.ruleset.bingo_count) {
				self.teams[t].assignedAnti.push(-1);
			}
			while (self.teams[t].goalBingos.length < self.ruleset.bingo_count) {
				self.teams[t].goalBingos.push(-1);
			}
		}
	};

	self.assignAnti = function(p, frontId) {
		if (!self.ruleset.antibingo)
			return false;
		var bingoId = board.convertFrontId(self.ruleset.size, frontId);
		if (self.teams[self.players[p].team].assignedAnti.length < self.ruleset.bingo_count && !self.teams[self.players[p].team].assignedAnti.includes(bingoId)) {
			self.teams[self.players[p].team].giveAnti(bingoId);
			self.teams[self.teams[self.players[p].team].antiTeam].receiveAnti(bingoId);
			return true; // success
		}
		return false; // fail
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
				self.teams[team].addPlayer(p);
			else
				self.teams[team] = new Team(team, p);
		}

		// anti teams
		if (self.ruleset.antibingo) {
			if (Object.keys(self.teams).length < 2) { // cancel anti if too few teams
				self.ruleset.antibingo = false;
				self.antiForceAssign();
			} else {
				var teamKeys = Object.keys(self.teams);
				var teamKeys2 = teamKeys.slice(1, teamKeys.length);
				teamKeys2.push(teamKeys[0]);

				var teamAssignments = {}
				for (var i = 0; i < teamKeys.length; i++) {
					teamAssignments[teamKeys[i]] = teamKeys2[i]
				}

				for (var t in self.teams) {
					self.teams[t].setAntiTeam(teamAssignments[t]);
				}
			}
		}

		// reveal if needed
		if (!self.ruleset.hidden) {
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
				for (var t in self.teams) {
					if (self.teams[t].goalsAchieved.length < self.goals.length)
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

		self.teams[self.players[replay.user].team].addProgress(replay);
		self.players[replay.user].addProgress(replay);

		var success = false;
		for (var i = 0; i < self.goals.length; i++) {
			if (self.ruleset.lockout && self.goals[i].isAchieved() || self.teams[self.players[replay.user].team].goalsAchieved.includes(i)) {
				continue;
			} else if (self.goals[i].compareReplay(replay, self.teams[self.players[replay.user].team], self.players)) {
				self.goals[i].addAchiever(replay.user);
				self.teams[self.players[replay.user].team].achieveGoal(i);
				self.players[replay.user].achieveGoal(i);
				success = true;
				if (self.ruleset.hidden)
					self.revealGoalNeighbors(i);
				// console.log("GOAL ACHIEVED", i, replay.username);
			}
		}

		if (success) {
			if (!self.firstGoal && self.ruleset.antibingo) {
				self.antiForceAssign();
			}
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
			boardData.playerTeam = player in self.players ? self.players[player].team : undefined;
			for (var id in self.players) {
				var data = self.players[id].getBoardData();
				if (self.players[id].team in self.teams)
					self.teams[self.players[id].team].addTeamData(data);
				boardData.players[id] = data;
			}

			boardData.goals = {};
			for (var i = 0; i < self.goals.length; i++) {
				boardData.goals[i] = self.goals[i].getBoardData();
				if (self.goals[i].goalData.type == "total" && player in self.players)
					boardData.goals[i].progress = Math.min(self.teams[self.players[player].team].countObjective(self.goals[i].goalData, self.players), self.goals[i].goalData.total);
			}
		}

		return boardData;
	};

	self.getPlayerData = function() {
		var playerData = {};

		playerData.players = [];
		for (var id in self.players) {
			var data = self.players[id].getBoardData();
			if (self.players[id].team in self.teams)
				self.teams[self.players[id].team].addTeamData(data);
			playerData.players.push(data);
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

		for (var id in self.teams) {
			delete self.teams[id];
		}
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