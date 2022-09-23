var getJSON = require('get-json');
var seedrandom = require('seedrandom');

var board = require('./board');
var goal = require('./goal');
var Team = require('./team');
var Player = require('./player');

var utils = require('./utils');
var levels = require('./levels');
var constants = require('./constants');
var options = require('./options');

var Bingo = function(session, ruleset) {
	var self = this;
	self.session = session;
	self.ruleset = ruleset;

	self.active = false;
	self.startTime = 0;
	self.lastReplay = 0;
	self.firstGoal = false;
	self.isWon = false;
	self.finished = false;
	self.teamsDone = 0;
	self.allAntisAssigned = false;
	self.error = false;

	self.teams = {};
	self.players = {};

	self.log = [];

	// translate ruleset
	self.ruleset.size = parseInt(self.ruleset.size, 10);
	for (var r in self.ruleset) {
		if (self.ruleset[r] == "true")
			self.ruleset[r] = true;
		if (self.ruleset[r] == "false")
			self.ruleset[r] = false;
	}
	switch (self.ruleset.difficulty_raw) {
		case "Easy":      self.ruleset.difficulty = 5; self.ruleset.maxEasy = 8; break;
		case "Normal":    self.ruleset.difficulty = 3; self.ruleset.maxEasy = 6; break;
		case "Hard":      self.ruleset.difficulty = 2; self.ruleset.maxEasy = 5; break;
		case "Very Hard": self.ruleset.difficulty = 1; self.ruleset.maxEasy = 3; break;
	}
	switch (self.ruleset.length_raw) {
		case "Fast": self.ruleset.length = 4; break;
		case "Normal": self.ruleset.length = 3; break;
		case "Long": self.ruleset.length = 2; break;
		case "Full Game": self.ruleset.length = 1; break;
	}

	if (self.ruleset.rando || self.ruleset.rando64) {
		self.ruleset.rando_type = self.ruleset.rando_json.args.type;

		// force disable some goal types
		if (self.ruleset.rando_type == "atlas") {
			self.ruleset.apples = false;
			self.ruleset.sfinesse = false;
			self.ruleset.scomplete = false;
			self.ruleset.bcomplete = false;
			self.ruleset.dcomplete = false;
			self.ruleset.nosuper = false;
			// self.ruleset.genocide = false;
			self.ruleset.unload = false;
			self.ruleset.lowdash = false;
			self.ruleset.lowjump = false;
			self.ruleset.lowattack = false;
			self.ruleset.lowdirection = false;
		}
		self.ruleset.tutorials = false;
		self.ruleset.difficults = false;

		self.ruleset.levelset = {};
		for (var i = 0; i < self.ruleset.rando_json.levels.length; i++) {
			self.ruleset.levelset[self.ruleset.rando_json.levels[i]] = utils.resetDoorHub(i, self.ruleset.rando_json.doors[i]);
		}
	} else {
		self.ruleset.levelset = constants.defaultLevelset;
	}
	self.ruleset.keydist = utils.getKeydist(self.ruleset.levelset);

	// force certain rules in case it got past front end
	if (self.ruleset.gametype == "64") {
		self.ruleset.newgame = self.ruleset.newgame64;
		self.ruleset.hidden = self.ruleset.hidden64;
		self.ruleset.hiddenlocal = self.ruleset.hidden64local;
		self.ruleset.teams = self.ruleset.teams64;
		self.ruleset.plugins = self.ruleset.plugins64;
		self.ruleset.ss = self.ruleset.ss64;
		// self.ruleset.characters = self.ruleset.characters64;

		self.ruleset.size = self.ruleset.hub == "All" ? 8 : 4;
		self.ruleset.lockout = true;
		self.ruleset.antibingo = false;

		if (self.ruleset.win_type == "goal")
			self.ruleset.bingo_count = self.ruleset.goal_count;
		if (self.ruleset.win_type == "totalarea")
			self.ruleset.bingo_count = self.ruleset.hub == "All" ? 33 : 9;
		if (self.ruleset.win_type == "goal" || self.ruleset.win_type == "totalarea")
			self.ruleset.bingo_count_type = "goal";

		if (!self.ruleset.shuffle)
			self.ruleset.levelset = utils.reorderLevels64(self.ruleset);

	} else if (self.ruleset.antibingo) {
		self.ruleset.lockout = false;
		self.ruleset.hidden = false;
		if (self.ruleset.bingo_count_type != "bingo") {
			self.ruleset.bingo_count_type = "bingo";
			self.ruleset.bingo_count = 1;
		}
	}

	// manual seed for sharing local testing
	// Math.seedrandom();

	// make goals
	self.possibleBingos = self.ruleset.gametype == "bingo" ? board.cachePossibleBingos(self.ruleset.size) : [];
	self.goals = goal.makeGoals(self.ruleset, self.possibleBingos);

	// final error check
	self.error = "";
	if (self.goals.includes(undefined))
		self.error = "nobingo";
	else if (self.ruleset.size != 3 && self.ruleset.size != 4 && self.ruleset.size != 5 && self.ruleset.size != 8)
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
		if (!self.active && !(id in self.players) && Object.keys(self.players).length < 16) {
			self.players[id] = new Player(id, name);
			self.session.updatePlayers();
			return true;
		}
		return false;
	};

	self.removePlayer = function(id) {
		if (!self.active && id in self.players) {
			delete self.players[id];
			self.canStart(false);
			self.session.updatePlayers();
			return true;
		}
		return false;
	};

	self.ready = function(id) {
		if (!self.active && id in self.players) {
			self.players[id].setReady(true);
			self.canStart(false);
			self.session.updatePlayers();
		}
	};

	self.unready = function(id) {
		if (!self.active && id in self.players) {
			self.players[id].setReady(false);
			self.canStart(false);
			self.session.updatePlayers();
		}
	};

	self.voteReset = function(id) {
		if ((self.active || self.isWon) && id in self.players) {
			self.players[id].voteReset(true);
			self.resetBingo();
			self.session.updatePlayers();
		}
	};

	self.checkReset = function() {
		var needToReset = Object.keys(self.players).length / 2;
		var count = 0;
		for (var p in self.players) {
			if (self.players[p].reset)
				count++;
		}
		return count > needToReset && (self.active || self.isWon);
	};

	self.changePlayerColor = function(id, color) {
		if (self.startTime > 0)
			return;
		if (id in self.players) {
			if (self.players[id].changeColor(color)) {
				if (self.ruleset.teams)
					self.canStart(false);
				self.session.updatePlayers();
			}
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
			if (self.getGoalTeam(g))
				goalsAchieved++;
		}
		return goalsAchieved;
	};

	self.countTeamGoals = function(t) {
		var count = 0;
		for (var g in self.goals) {
			if (self.getGoalTeam(g) == t)
				count++;
		}
		return count;
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
		if (self.ruleset.gametype == "64")
			return; // temp skip lockout check, needs algorithm adjustments for capture simulation

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
				else if (possibleWinners.includes(t)) { // tie win, not already done
					self.teams[t].finish(Date.now() - self.startTime, true, 1);
					self.addLog({type: "finish", team: t, str: "Finished"});
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
					self.addLog({type: "finish", team: rankedTeams[sortedRanks[score]][t], str: "Finished"});
				}
				self.teamsDone += rankedTeams[sortedRanks[score]].length;
			}

		} else if (possibleWinners.length == 1) {
			// force win
			self.isWon = true;
			self.teams[possibleWinners[0]].finish(Date.now() - self.startTime, true, self.teamsDone + 1);
			self.addLog({type: "finish", team: possibleWinners[0], str: "Finished"});
			self.teamsDone++;
		}
	};

	self.updateTeamRegions = function() {
		for (var t in self.teams) {
			self.teams[t].totalRegion = self.countTeamGoals(t);
			self.teams[t].totalRegionSafe = self.countTeamSafeRegion(t);
			self.teams[t].biggestRegion = self.getBiggestRegion(t, false);
			self.teams[t].biggestRegionSafe = self.getBiggestRegion(t, true);
		}
	};


	self.checkBiggestRegions = function() {
		// console.log("checkBiggestRegions");
		var initialBoardState = [];
		for (var g in self.goals) {
			initialBoardState.push(self.goals[g].captured);
		}

		var biggestTeam = -1;
		var possibleWinners = [];
		function findBiggestTeam() {
			// use local possibleWinners again if simulated
			for (var t in self.teams) {
				var regionValue = self.ruleset.win_type == "totalarea" ? self.teams[t].totalRegionSafe : self.teams[t].biggestRegionSafe;
				if (regionValue > biggestTeam) {
					biggestTeam = regionValue;
					possibleWinners = [t];
				} else if (regionValue == biggestTeam)
					possibleWinners.push(t);
			}
			// return {possibleWinners: possibleWinners, size: tBig};
		};

		if (!self.isWon)
			findBiggestTeam();
		// initialWinState = findBiggestTeam();
		// console.log(initialWinState);
		// console.log(biggestTeam, possibleWinners);

		if (self.countGoalsAchieved() == self.goals.length) {
			// force end
			self.isWon = true;
			var rankedTeams = {}; // score: [t]
			for (var t in self.teams) {
				if (self.teams[t].finishTime > 0)
					continue;
				else if (possibleWinners.includes(t)) { // tie win, not already done
					self.teams[t].finish(Date.now() - self.startTime, true, 1);
					self.addLog({type: "finish", team: t, str: "Finished"});
				} else {
					var score = self.countTeamGoals(t);
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
					self.addLog({type: "finish", team: rankedTeams[sortedRanks[score]][t], str: "Finished"});
				}
				self.teamsDone += rankedTeams[sortedRanks[score]].length;
			}
		} else if (!self.isWon && biggestTeam > self.ruleset.size * self.ruleset.size / 2) {
			// force win
			self.isWon = true;
			self.teams[possibleWinners[0]].finish(Date.now() - self.startTime, true, self.teamsDone + 1);
			self.addLog({type: "finish", team: possibleWinners[0], str: "Finished"});
			self.teamsDone++;
		}

		/*function resetGoals() {
			for (var g in self.goals) {
				self.goals[g].captured = initialBoardState[g];
			}
		};

		function simFill(t) {
			for (var g in self.goals) {
				if (!self.getGoalTeam(g)) {
					self.goals[g].captured = t;
					self.checkCapture(g);
				}
			}
		};

		simulate/reset team regions needed

		for (var t in self.teams) {
			if (initialWinState.possibleWinners.includes(t) || !self.teams[t].canWin)
				continue;

			self.simFill(t);
			simWinner = findBiggestTeam();

			if (simWinner.team != t && simWinner.size > self.getBiggestRegion(t, true)) {
				t.canWin = false;
			}

			// this is flawed because fill order matters to maximize capturing
			// should prioritize moves that don't result in being captured
			// don't simulate to determine a forced win until this is completed

			resetGoals();
		}*/

		// after sim, if at least one team canWin, no winner yet
		// else winning team wins now

	};

	self.checkFinished = function(id) {
		if (self.teams[id].finishTime > 0)
			return; // already done

		var teamFinished = false;

		if (self.ruleset.gametype == "64") {
			if (self.ruleset.win_type == "totalarea" || self.ruleset.win_type == "area") {
				self.checkBiggestRegions();
			} else if (self.ruleset.win_type == "goal" && self.countTeamGoals(id) >= self.ruleset.bingo_count) {
				teamFinished = true;
			}
		} else if (self.ruleset.gametype == "bingo") {
			if (self.ruleset.bingo_count_type == "bingo" && self.countBingo(id) >= self.ruleset.bingo_count) {
				teamFinished = true;
			} else if (self.ruleset.bingo_count_type == "goal" && self.teams[id].goalsAchieved.length >= self.ruleset.bingo_count) {
				teamFinished = true;
			}
		}

		if (teamFinished) {
			self.teams[id].finish(Date.now() - self.startTime, !self.isWon, self.teamsDone + 1);
			self.addLog({type: "finish", team: id, str: "Finished"});
			self.isWon = true;
			self.teamsDone++;
		}

	};

	self.revealGoalNeighbors = function(i, t) {
		// original goal
		if (!self.ruleset.hiddenlocal)
			self.teams[t].revealGoal(i);
		else
			self.goals[i].reveal();

		if (i >= self.ruleset.size) { // not top, reveal above
			if (!self.ruleset.hiddenlocal)
				self.teams[t].revealGoal(i - self.ruleset.size);
			else
				self.goals[i - self.ruleset.size].reveal();
		}
		if (i < self.ruleset.size * self.ruleset.size - self.ruleset.size) { // not bottom, reveal below
			if (!self.ruleset.hiddenlocal)
				self.teams[t].revealGoal(i + self.ruleset.size);
			else
				self.goals[i + self.ruleset.size].reveal();
		}
		if (i % self.ruleset.size > 0) { // not left, reveal left
			if (!self.ruleset.hiddenlocal)
				self.teams[t].revealGoal(i - 1);
			else
				self.goals[i - 1].reveal();
		}
		if (i % self.ruleset.size < self.ruleset.size - 1) { // not right, reveal right
			if (!self.ruleset.hiddenlocal)
				self.teams[t].revealGoal(i + 1);
			else
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
		self.allAntisAssigned = true;
	};

	self.checkAntisAssigned = function() {
		var brk = false;
		for (var t in self.teams) {
			if (self.teams[t].assignedAnti.length < self.ruleset.bingo_count) {
				brk = true;
				break;
			}
		}
		self.allAntisAssigned = !brk;
	};

	self.assignAnti = function(p, frontId) {
		if (!self.ruleset.antibingo)
			return false;
		var bingoId = board.convertFrontId(self.ruleset.size, frontId);
		if (self.teams[self.players[p].team].assignedAnti.length < self.ruleset.bingo_count && !self.teams[self.players[p].team].assignedAnti.includes(bingoId)) {
			self.teams[self.players[p].team].giveAnti(bingoId);
			self.teams[self.teams[self.players[p].team].antiTeam].receiveAnti(bingoId);
			self.checkAntisAssigned();

			self.session.updateBoard();
			self.session.updatePlayers();
			return true; // success
		}
		return false; // fail
	};


	self.getGoalTeam = function(g) {
		return self.goals[g].captured || (self.goals[g].isAchieved() ? self.players[self.goals[g].achieved[0]].team : undefined);
	};

	self.isRegionSafe = function(region) {
		var safe = false;
		for (var r in region) {
			var isTop = region[r] < self.ruleset.size;
			var isBottom = region[r] >= self.ruleset.size * self.ruleset.size - self.ruleset.size;
			var isLeft = region[r] % self.ruleset.size == 0;
			var isRight = region[r] % self.ruleset.size == self.ruleset.size - 1;
			if (isTop || isBottom || isLeft || isRight) {
				safe = true;
				break;
			}
		}
		if (safe) {
			for (var r in region) {
				self.goals[region[r]].setSafe();
			}
		}
		return safe;
	};

	self.getBiggestRegion = function(t, safeOnly) {
		// console.log("getBiggestRegion", t)
		var region = [];
		var checked = [];
		var biggest = 0;

		for (var g in self.goals) {
			if (checked.includes(g))
				continue;
			if (t != self.getGoalTeam(g))
				continue;

			// console.log("check size", g, checked.length);
			self.getRegion(parseInt(g, 10), region, checked, [], t, true);
			// console.log(g, region.length, region);
			if (safeOnly && !self.isRegionSafe(region))
				region = [];
			if (region.length > biggest)
				biggest = region.length;
			region = [];
		}

		return biggest;
	};

	self.countTeamSafeRegion = function(t) {
		// console.log("countTeamSafeRegion", t)
		var region = [];
		var checked = [];
		var total = 0;

		for (var g in self.goals) {
			if (checked.includes(g))
				continue;
			if (t != self.getGoalTeam(g))
				continue;

			// console.log("check size", g, checked.length);
			self.getRegion(parseInt(g, 10), region, checked, [], t, true);
			// console.log(g, region.length, region);
			if (!self.isRegionSafe(region))
				region = [];
			total += region.length;
			region = [];
		}

		return total;
	};

	self.checkCapture = function(g) {
		var region = [];
		var checked = [g];
		var verified = [];
		var gTeam = self.getGoalTeam(g);
		// console.log("checkCapture", g, gTeam);

		// check table borders
		var isTop = g < self.ruleset.size;
		var isBottom = g >= self.ruleset.size * self.ruleset.size - self.ruleset.size;
		var isLeft = g % self.ruleset.size == 0;
		var isRight = g % self.ruleset.size == self.ruleset.size - 1;
		// console.log(isTop, isBottom, isLeft, isRight);

		function failedRegionToVerified() {
			// console.log("failedRegionToVerified add", region.length);
			if (region.length > 0) {
				for (var r in region) {
					if (!verified.includes(region[r]))
						verified.push(region[r]);
				}
				region = [];
			}
			// console.log(verified);
		};

		// check if g contributes to capturing anything
		if (!isTop && !self.getRegion(g - self.ruleset.size, region, checked, verified, gTeam, false)) {
			// console.log("top success", region);
			if (region.length > 0) {
				self.captureRegion(gTeam, region);
				region = [];
			}
		}
		failedRegionToVerified();
		if (!isBottom && !self.getRegion(g + self.ruleset.size, region, checked, verified, gTeam, false)) {
			// console.log("bottom success", region);
			if (region.length > 0) {
				self.captureRegion(gTeam, region);
				region = [];
			}
		}
		failedRegionToVerified();
		if (!isLeft && !self.getRegion(g - 1, region, checked, verified, gTeam, false)) {
			// console.log("left success", region);
			if (region.length > 0) {
				self.captureRegion(gTeam, region);
				region = [];
			}
		}
		failedRegionToVerified();
		region = [];
		if (!isRight && !self.getRegion(g + 1, region, checked, verified, gTeam, false)) {
			// console.log("right success", region);
			if (region.length > 0) {
				self.captureRegion(gTeam, region);
				region = [];
			}
		}
		failedRegionToVerified();


		// check if getting g causes it to be captured
		if (self.ruleset.captureother) {
			var captured = true;
			while (captured) {
				captured = false;
				gTeam = self.getGoalTeam(g);
				for (var t in self.teams) {
					if (t == gTeam)
						continue;
					region = [];
					if (self.getRegion(g, region, [], [], t, false))
						continue;

					// console.log("got captured", region);
					self.captureRegion(t, region);
					captured = true;
					break;
				}
			}
		}

	};

	self.getRegion = function(g, region, checked, verified, team, countTeam) {
		// console.log("getRegion", g, region, checked, team, countTeam);
		if (verified.includes(g))
			return true;
		if (checked.includes(g))
			return;
		checked.push(g);
		// console.log(g, "not in checked")

		// check table borders
		var isTop = g < self.ruleset.size;
		var isBottom = g >= self.ruleset.size * self.ruleset.size - self.ruleset.size;
		var isLeft = g % self.ruleset.size == 0;
		var isRight = g % self.ruleset.size == self.ruleset.size - 1;
		// console.log(g, isTop, isBottom, isLeft, isRight);

		// count matches team only
		if (countTeam) {
			if (team != self.getGoalTeam(g))
				return;
		} else { // team is border only
			var gTeam = self.getGoalTeam(g);
			if (gTeam) {
				if (team == gTeam)
					return; // border
				if (!self.ruleset.captureother) {
					verified.push(g);
					return true; // can't capture others
				}
			} else if (!self.ruleset.captureblank) {
				verified.push(g);
				return true; // can't capture blanks
			}
		}
		// console.log(g, "team check pass")

		if (!countTeam && (isTop || isBottom || isLeft || isRight)) {
			verified.push(g);
			return true;
		}

		// console.log(g, "add to region")
		// success add to region
		region.push(g);

		// recursive calls
		if (!isTop && self.getRegion(g - self.ruleset.size, region, checked, verified, team, countTeam))
			return true;
		if (!isBottom && self.getRegion(g + self.ruleset.size, region, checked, verified, team, countTeam))
			return true;
		if (!isLeft && self.getRegion(g - 1, region, checked, verified, team, countTeam))
			return true;
		if (!isRight && self.getRegion(g + 1, region, checked, verified, team, countTeam))
			return true;

		// console.log(g, "recursive success");
	};

	self.captureRegion = function(t, region) {
		// console.log("captureRegion", t, region);
		for (var g in region) {
			self.goals[region[g]].capture(t);
			self.addLog({type: "capture", team: t, str: "Goal captured: " + self.goals[region[g]].toString()});
		}
	};

	self.canStart = function(startPressed) {
		var ready = false;
		for (var p in self.players) {
			if (self.players[p].getReady()) {
				ready = true;
				break;
			}
		}
		if (!ready) {
			self.session.canStart(false);
			return false;
		}

		// cancel anti if too few teams
		var readyPlayers = [];
		var teamsToAdd = [];
		for (var p in self.players) {
			if (self.players[p].getReady()) {
				readyPlayers.push(p);
			}
		}
		for (var i = 0; i < readyPlayers.length; i++) {
			var team = self.ruleset.teams ? self.players[readyPlayers[i]].color : readyPlayers[i];
			if (!teamsToAdd.includes(team))
				teamsToAdd.push(team);
		}

		if (self.ruleset.antibingo && teamsToAdd.length < 2) {
			self.session.canStart(false);
			return false;
		}

		if (!startPressed)
			self.session.canStart(true);
		return true;
	};

	self.start = function() {
		self.active = true;
		self.firstGoal = false;
		self.isWon = false;
		self.finished = false;
		self.teamsDone = 0;
		self.allAntisAssigned = false;

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
			if (Object.keys(self.teams).length < 2) { // old cancel anti if too few teams
				self.ruleset.antibingo = false;
				self.antiForceAssign();
			} else {
				var teamKeys = Object.keys(self.teams);
				var teamKeys2 = teamKeys.slice(1, teamKeys.length);
				teamKeys2.push(teamKeys[0]);

				var teamAssignments = {};
				for (var i = 0; i < teamKeys.length; i++) {
					teamAssignments[teamKeys[i]] = teamKeys2[i]
				}

				for (var t in self.teams) {
					self.teams[t].setAntiTeam(teamAssignments[t]);
				}
			}
		}

		// reveal middle if needed
		if (self.ruleset.hidden && self.ruleset.gametype != "64") {
			// same spawn point
			
			// if (self)

			var allSpawnsPlaced = false;
			var s = 0; // 
			while (!allSpawnsPlaced) {
				var r = Math.floor(Math.random() * self.ruleset.size);
				var c = Math.floor(Math.random() * self.ruleset.size);
				var i = r * self.ruleset.size + c;
				if (self.ruleset.size == 3) {
					if (i % 2 == 0) // no corner/middle
						continue;
				} else { // no border
					if (r == 0 || r == self.ruleset.size - 1)
						continue;
					if (c == 0 || c == self.ruleset.size - 1)
						continue;
				}

				if (self.ruleset.hiddensame) {
					for (var t in self.teams) {
						self.teams[t].revealGoal(i);
					}
					allSpawnsPlaced = true;

				} else {
					var t_index = 0;
					var placedSpawn = false;
					for (var t in self.teams) {
						if (t_index == s) {
							self.teams[t].revealGoal(i);
							placedSpawn = true;
							break;
						}
						t_index++;
					}
					s++;
					if (!placedSpawn) // attempted one more than limit
						allSpawnsPlaced = true;
				}
			}

			// old choose middle
			// if (self.ruleset.size % 2 == 0)
				// self.goals[self.ruleset.size * self.ruleset.size / 2 - self.ruleset.size / 2 - 1].reveal();
			// else
				// self.goals[Math.floor(self.ruleset.size * self.ruleset.size / 2)].reveal();
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
		if (replay.validated == -9) {
			if (!self.ruleset.unload)
				return false;
		} else if (!self.ruleset.plugins) {
			if (replay.validated < 1 && replay.validated != -3)
				return false;
		}
		if (replay.tag && replay.tag.mode && replay.tag.mode == "dbg_0")
			return false;

		// in players
		if (!(replay.user in self.players))
			return false;

		// in levels
		if (!self.ruleset.levelset[replay.level])
			return false;
		// if (levels.levels[replay.level].hub == "Tutorial" && !self.ruleset.tutorials)
			// return false;
		// if (levels.levels[replay.level].hub == "Difficult" && !self.ruleset.difficults)
			// return false;

		self.lastReplay = Date.now();
		self.teams[self.players[replay.user].team].addProgress(replay, self.ruleset.levelset[replay.level]);
		self.players[replay.user].addProgress(replay, self.ruleset.levelset[replay.level]);
		self.addLog({
			type: "replay",
			replay_id: replay.replay_id,
			team: self.players[replay.user].team,
			player: replay.user,
			level: replay.levelname,
			score: utils.getReplayScore(replay),
			character: constants.characters[replay.character],
			replay_time: replay.time,
			str: "Replay: " + utils.getReplayScore(replay) + " " + replay.levelname + " " + constants.characters[replay.character]
		});

		var success = false;
		for (var i = 0; i < self.goals.length; i++) {
			if (self.ruleset.lockout && self.getGoalTeam(i) || self.teams[self.players[replay.user].team].goalsAchieved.includes(i)) {
				continue;
			} else if (self.goals[i].compareReplay(replay, self.teams[self.players[replay.user].team], self.players, self.ruleset.levelset)) {
				self.goals[i].addAchiever(replay.user, self.players[replay.user].team);
				self.teams[self.players[replay.user].team].achieveGoal(i);
				self.players[replay.user].achieveGoal(i);
				success = true;
				// // console.log("GOAL ACHIEVED", i, replay.username);
				self.addLog({type: "goal", team: self.players[replay.user].team, player: replay.user, str: "Goal: " + self.goals[i].toString()});
				if (self.ruleset.hidden)
					self.revealGoalNeighbors(i, self.players[replay.user].team);
				if (self.ruleset.gametype == "64") {
					self.checkCapture(i);
					self.updateTeamRegions();
				}
			}
		}

		if (success) {
			if (!self.firstGoal && self.ruleset.antibingo) {
				self.antiForceAssign();
			}
			self.firstGoal = true;
			if (self.ruleset.bingo_count_type == "bingo") {
				for (var p in self.players) {
					self.teams[self.players[p].team].bingos = self.countBingo(self.players[p].team);
				}
			}
			self.checkFinished(self.players[replay.user].team);
			if (self.ruleset.hidden && self.teamsDone >= Object.keys(self.players).length) {
				for (var g in self.goals) {
					self.goals[g].reveal(); // old reveal when all teams done
				}
			}
			if (self.ruleset.lockout)
				self.checkLockout();
			self.session.updateBoard();
			self.session.updatePlayers();
			self.checkAllGoalsComplete();
		} else {
			self.session.updateTeamBoard(self.players[replay.user].team);
			self.session.updateLastReplay(self.lastReplay);
		}
		return true;
	};

	self.getBoardData = function(player) {
		var boardData = {};
		var isPlayer = player in self.players;

		if (self.active || self.finished) {
			boardData.state = self.getState();
			boardData.firstGoal = self.firstGoal;
			boardData.size = self.ruleset.size;
			boardData.allAntisAssigned = self.allAntisAssigned;

			boardData.players = {};
			boardData.playerTeam = isPlayer ? self.players[player].team : undefined;
			for (var id in self.players) {
				var data = self.players[id].getBoardData();
				if (self.players[id].team in self.teams)
					self.teams[self.players[id].team].addTeamData(data, self.ruleset);
				boardData.players[id] = data;
			}

			boardData.goals = {};
			for (var i = 0; i < self.goals.length; i++) {
				boardData.goals[i] = self.goals[i].getBoardData(isPlayer ? self.teams[boardData.playerTeam].hasRevealed(i) : self.goals[i].isAchieved(), isPlayer);

				if (self.goals[i].goalData.type == "total" && isPlayer) {
					boardData.goals[i].progress = Math.min(self.teams[boardData.playerTeam].countObjective(self.ruleset.levelset, self.goals[i].goalData, self.players), self.goals[i].goalData.total);
				}
			}

			boardData.startTime = self.startTime;
			boardData.lastReplay = self.lastReplay;
			// boardData.log = self.log;
		}

		return boardData;
	};

	self.getPlayerData = function() {
		var playerData = {};

		playerData.players = [];
		for (var id in self.players) {
			var data = self.players[id].getBoardData();
			if (self.players[id].team in self.teams)
				self.teams[self.players[id].team].addTeamData(data, self.ruleset);
			playerData.players.push(data);
		}

		playerData.allAntisAssigned = self.allAntisAssigned;

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

	self.addLog = function(data) {
		var delta = new Date(Date.now() - self.startTime);
		var h = delta.getUTCHours();
		var m = delta.getMinutes();
		var s = delta.getSeconds();
		data.time = (h > 0 ? h + ":" : "") + (h > 0 && m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
		self.log.push(data);
		self.session.updateLog(self.log);
	};

	self.resetBingo = function() {
		if (!self.checkReset())
			return;

		// states
		self.active = false;
		self.startTime = 0;
		self.lastReplay = 0;
		self.firstGoal = false;
		self.isWon = false;
		self.finished = false;
		self.teamsDone = 0;
		self.allAntisAssigned = false;

		// unready all
		for (var p in self.players) {
			self.players[p].resetVars();
		}
		self.teams = {};
		self.log = [];

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

		delete self.log;
		delete self.ruleset;
		delete self.session;

		delete self;
	}

	return self;
};

module.exports = Bingo;