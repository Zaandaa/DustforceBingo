var getJSON = require('get-json');

var board = require('./board');
var levels = require('./levels');
var utils = require('./utils');
var constants = require('./constants');


var Team = function(id, p) {
	var self = this;
	self.id = id;
	self.players = [p];

	self.finishTime = 0;
	self.isWinner = false;
	self.place = 0;

	self.goalsAchieved = []; // list of ids of goals achieved
	self.allCompletes = []; // all completes {user id, level, completion, finesse, character}
	self.allProgress = {}; // dictionary of levels beaten
	self.charProgress = {"Dustman": {}, "Dustgirl": {}, "Dustkid": {}, "Dustworth": {}}; // dictionary of levels beaten

	// used by bingo for win checking
	self.bingos = 0;
	self.maxBingos = 0;
	self.maxGoals = 0;
	self.canWin = true;
	self.totalRegion = 0;
	self.totalRegionSafe = 0;
	self.biggestRegion = 0;
	self.biggestRegionSafe = 0;

	self.antiTeam = id;
	self.assignedAnti = [];
	self.goalBingos = [];

	self.toString = function() {
		return self.id;
	};

	self.addPlayer = function(p) {
		self.players.push(p);
	};

	self.addTeamData = function(pData, ruleset) {
		pData.team = self.id;
		pData.finishTime = self.finishTime;
		pData.isWinner = self.isWinner;
		pData.place = self.place;
		pData.teamGoals = self.goalsAchieved.length;
		pData.bingos = self.bingos;
		pData.antiTeam = self.antiTeam;
		pData.assignedAnti = self.assignedAnti;
		pData.goalBingos = [];
		for (var gb in self.goalBingos) {
			if (self.goalBingos[gb] != -1)
				pData.goalBingos.push(board.convertGoalBingo(ruleset.size, self.goalBingos[gb]));
		}
		pData.totalRegion = self.totalRegion;
		pData.totalRegionSafe = self.totalRegionSafe;
		pData.biggestRegion = self.biggestRegion;
		pData.biggestRegionSafe = self.biggestRegionSafe;
	};

	self.setAntiTeam = function(a) {
		self.antiTeam = a;
	};

	self.giveAnti = function(a) {
		self.assignedAnti.push(a);
	};

	self.receiveAnti = function(a) {
		self.goalBingos.push(a);
	};

	self.finish = function(t, w, p) {
		self.finishTime = t;
		self.isWinner = w;
		self.place = p;
	};

	self.achieveGoal = function(id) {
		if (!self.goalsAchieved.includes(id))
			self.goalsAchieved.push(id);
	};

	self.addProgress = function(replay, door) {
		if (replay.validated == -9)
			return;

		self.allCompletes.push({player: replay.user, level: replay.level, score: utils.getReplayScore(replay), character: constants.characters[replay.character], apples: replay.apples});

		// allProgress
		if (replay.level in self.allProgress) {
			// score
			if (self.allProgress[replay.level].completion < replay.score_completion) {
				self.allProgress[replay.level].completion = replay.score_completion;
			}
			if (self.allProgress[replay.level].finesse < replay.score_finesse) {
				self.allProgress[replay.level].finesse = replay.score_finesse;
			}
			// if character not in characters, add character to characters
			if (!self.allProgress[replay.level].characters.includes(constants.characters[replay.character])) {
				self.allProgress[replay.level].characters.push(constants.characters[replay.character]);
			}
			// better gimmicks
			for (var g in levels.gimmicks) {
				self.allProgress[replay.level].gimmicks[g] = utils.betterGimmick(g, utils.accessGimmick(replay, g), self.allProgress[replay.level].gimmicks[g]);
			}

		} else {
			self.allProgress[replay.level] = {
				completion: replay.score_completion,
				finesse: replay.score_finesse,
				characters: [constants.characters[replay.character]],
				gimmicks: {}
			}

			for (var g in levels.gimmicks) {
				self.allProgress[replay.level].gimmicks[g] = utils.accessGimmick(replay, g);
			}
		}

		// charProgress
		if (replay.level in self.charProgress[constants.characters[replay.character]]) {
			// score + keys
			if (self.charProgress[constants.characters[replay.character]][replay.level].completion < replay.score_completion)
				self.charProgress[constants.characters[replay.character]][replay.level].completion = replay.score_completion;
			if (self.charProgress[constants.characters[replay.character]][replay.level].finesse < replay.score_finesse)
				self.charProgress[constants.characters[replay.character]][replay.level].finesse = replay.score_finesse;

			// better gimmicks
			for (var g in levels.gimmicks) {
				self.charProgress[constants.characters[replay.character]][replay.level].gimmicks[g] = utils.betterGimmick(g, utils.accessGimmick(replay, g), self.allProgress[replay.level].gimmicks[g]);
			}

		} else {
			self.charProgress[constants.characters[replay.character]][replay.level] = {
				completion: replay.score_completion,
				finesse: replay.score_finesse,
				characters: [constants.characters[replay.character]],
				gimmicks: {}
			}

			for (var g in levels.gimmicks) {
				self.charProgress[constants.characters[replay.character]][replay.level].gimmicks[g] = utils.accessGimmick(replay, g);
			}
		}

	};

	self.countObjective = function(levelset, goalData, bingoPlayers) {
		if (!goalData.count)
			return // don't know what to count, assume goalData correct otherwise

		var count = 0;

		if (goalData.count == "Beat") {
			// goalData.character, goalData.hub, goalData.leveltype
			for (var l in self.allProgress) {
				if (goalData.hub && utils.getHub(levelset[l]) != goalData.hub)
					continue;
				if (goalData.leveltype && utils.getLevelType(levelset[l]) != goalData.leveltype)
					continue;
				if (goalData.character && !(l in self.charProgress[goalData.character]))
					continue;
				count++;
			}
		} else if (goalData.count == "SS") {
			// goalData.character, goalData.hub, goalData.leveltype
			for (var l in self.allProgress) {
				if (self.allProgress[l].completion < 5 || self.allProgress[l].finesse < 5)
					continue;
				if (goalData.hub && utils.getHub(levelset[l]) != goalData.hub)
					continue;
				if (goalData.leveltype && utils.getLevelType(levelset[l]) != goalData.leveltype)
					continue;
				if (goalData.character && (!(l in self.charProgress[goalData.character])))
					continue;
				if (goalData.character && (self.charProgress[goalData.character][l].completion < 5 || self.charProgress[goalData.character][l].finesse < 5))
					continue;
				count++;
			}
		} else if (goalData.count == "keys") {
			count = 0;
			for (var p in self.players) {
				count += Math.floor(bingoPlayers[self.players[p]].countKeys(goalData));
			}
		} else if (goalData.count == "apples") {
			var levelCount = 0;
			if (goalData.appleType == "SS") {
				var levelsUsed = [];
				for (var l in self.allCompletes) {
					if (levelsUsed.includes(self.allCompletes[l].level))
						continue;
					if (self.allCompletes[l].score != "SS")
						continue;

					if (goalData.hub && utils.getHub(levelset[self.allCompletes[l].level]) != goalData.hub)
						continue;
					if (goalData.leveltype && utils.getLevelType(levelset[self.allCompletes[l].level]) != goalData.leveltype)
						continue;
					if (goalData.character && self.allCompletes[l].character != goalData.character)
						continue;

					if (self.allCompletes[l].apples < 1)
						continue;

					levelsUsed.push(self.allCompletes[l].level);
					count++;
				}
			} else { // "Beat" and "count"
				for (var l in self.allProgress) {
					if (self.allProgress[l].gimmicks[goalData.count] > 0) {
						if (goalData.hub && utils.getHub(levelset[l]) != goalData.hub)
							continue;
						if (goalData.leveltype && utils.getLevelType(levelset[l]) != goalData.leveltype)
							continue;
						if (goalData.character && !(l in self.charProgress[goalData.character]))
							continue;
						if (goalData.character && self.charProgress[goalData.character][l].gimmicks[goalData.count] < 1)
							continue;

						levelCount++;
						count += goalData.character ? self.charProgress[goalData.character][l].gimmicks[goalData.count] : self.allProgress[l].gimmicks[goalData.count];
					}
				}
				if (goalData.appleType == "Beat")
					count = levelCount;
			}
		}

		return count;
	};

	return self;
};

module.exports = Team;
