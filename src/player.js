var getJSON = require('get-json');

var levels = require('./levels');
var utils = require('./utils');
var constants = require('./constants');

var Player = function(id, name) {
	var self = this;
	self.id = id;
	self.name = name;
	self.color = "white";
	self.team = id;
	self.ready = false;
	self.reset = false;

	self.finishTime = 0;
	self.isWinner = false;
	self.place = 0;

	self.goalsAchieved = []; // list of ids of goals achieved
	self.allCompletes = []; // all completes {levelname, completion, finesse, character}
	self.allProgress = {}; // dictionary of levels beaten
	self.charProgress = {"Dustman": {}, "Dustgirl": {}, "Dustkid": {}, "Dustworth": {}}; // dictionary of levels beaten
	self.keyProgress = {
		"Forest": {"Wood": 0, "Silver": 0, "Gold": 0, "Red": 0},
		"Mansion": {"Wood": 0, "Silver": 0, "Gold": 0, "Red": 0},
		"City": {"Wood": 0, "Silver": 0, "Gold": 0, "Red": 0},
		"Laboratory": {"Wood": 0, "Silver": 0, "Gold": 0, "Red": 0},
	};

	// used by bingo for lockout forced win checking
	self.bingos = 0;
	self.maxBingos = 0;
	self.maxGoals = 0;
	self.canWin = true;

	self.assignedAnti = [];
	self.goalBingos = [];

	self.toString = function() {
		return self.name;
	};

	self.getBoardData = function() {
		return {id: self.id, name: self.name, team: self.team, ready: self.ready, reset: self.reset, color: self.color, finishTime: self.finishTime, isWinner: self.isWinner, place: self.place, goals: self.goalsAchieved.length, bingos: self.bingos};
	};

	self.getReady = function() {
		return self.ready;
	};

	self.setReady = function(r) {
		self.ready = r;
	};

	self.voteReset = function(r) {
		self.reset = self.ready ? r : false;
	};

	self.giveAnti = function(a) {
		self.assignedAnti.push(a);
	};

	self.receiveAnti = function(a) {
		self.goalBingos.push(a);
	};

	self.changeColor = function(c) {
		if (c != self.color) {
			self.color = c;
			return true;
		}
		return false;
	};

	self.finish = function(t, w, p) {
		self.finishTime = t;
		self.isWinner = w;
		self.place = p;
	};

	self.resetVars = function() {
		self.voteReset(false);
		self.setReady(false);

		self.finishTime = 0;
		self.isWinner = false;
		self.place = 0;

		self.goalsAchieved = [];
		self.allCompletes = [];
		self.allProgress = {};
		self.charProgress = {"Dustman": {}, "Dustgirl": {}, "Dustkid": {}, "Dustworth": {}};
		self.keyProgress = {
			"Forest": {"Wood": 0, "Silver": 0, "Gold": 0, "Red": 0},
			"Mansion": {"Wood": 0, "Silver": 0, "Gold": 0, "Red": 0},
			"City": {"Wood": 0, "Silver": 0, "Gold": 0, "Red": 0},
			"Laboratory": {"Wood": 0, "Silver": 0, "Gold": 0, "Red": 0},
		};

		self.bingos = 0;
		self.maxBingos = 0;
		self.maxGoals = 0;
		self.canWin = true;

		self.assignedAnti = [];
		self.goalBingos = [];
	};

	self.achieveGoal = function(id) {
		return self.goalsAchieved.push(id);
	};

	self.addProgress = function(replay) {
		if (replay.validated < 1 && replay.validated != -3)
			return;

		self.allCompletes.push({level: replay.levelname, score: utils.getReplayScore(replay), character: constants.characters[replay.character], apples: replay.apples});

		// allProgress and keyProgress
		if (replay.levelname in self.allProgress) {
			// score + keys
			if (self.allProgress[replay.levelname].completion < replay.score_completion) {
				if (levels.hubs[levels.levels[replay.levelname].hub].keys)
					self.keyProgress[levels.levels[replay.levelname].hub][levels.levels[replay.levelname].key] += replay.score_completion - self.allProgress[replay.levelname].completion;
				self.allProgress[replay.levelname].completion = replay.score_completion;
			}
			if (self.allProgress[replay.levelname].finesse < replay.score_finesse) {
				if (levels.hubs[levels.levels[replay.levelname].hub].keys)
					self.keyProgress[levels.levels[replay.levelname].hub][levels.levels[replay.levelname].key] += replay.score_finesse - self.allProgress[replay.levelname].finesse;
				self.allProgress[replay.levelname].finesse = replay.score_finesse;
			}
			// if character not in characters, add character to characters
			if (!self.allProgress[replay.levelname].characters.includes(constants.characters[replay.character])) {
				self.allProgress[replay.levelname].characters.push(constants.characters[replay.character]);
			}
			// better gimmicks
			for (var g in levels.gimmicks) {
				self.allProgress[replay.levelname].gimmicks[g] = utils.betterGimmick(g, utils.accessGimmick(replay, g), self.allProgress[replay.levelname].gimmicks[g]);
			}

		} else {
			self.allProgress[replay.levelname] = {
				completion: replay.score_completion,
				finesse: replay.score_finesse,
				characters: [constants.characters[replay.character]],
				gimmicks: {}
			}

			if (levels.hubs[levels.levels[replay.levelname].hub].keys)
				self.keyProgress[levels.levels[replay.levelname].hub][levels.levels[replay.levelname].key] += replay.score_completion + replay.score_finesse;

			for (var g in levels.gimmicks) {
				self.allProgress[replay.levelname].gimmicks[g] = utils.accessGimmick(replay, g);
			}
		}

		// charProgress
		if (replay.levelname in self.charProgress[constants.characters[replay.character]]) {
			// score + keys
			if (self.charProgress[constants.characters[replay.character]][replay.levelname].completion < replay.score_completion)
				self.charProgress[constants.characters[replay.character]][replay.levelname].completion = replay.score_completion;
			if (self.charProgress[constants.characters[replay.character]][replay.levelname].finesse < replay.score_finesse)
				self.charProgress[constants.characters[replay.character]][replay.levelname].finesse = replay.score_finesse;

			// better gimmicks
			for (var g in levels.gimmicks) {
				self.charProgress[constants.characters[replay.character]][replay.levelname].gimmicks[g] = utils.betterGimmick(g, utils.accessGimmick(replay, g), self.allProgress[replay.levelname].gimmicks[g]);
			}

		} else {
			self.charProgress[constants.characters[replay.character]][replay.levelname] = {
				completion: replay.score_completion,
				finesse: replay.score_finesse,
				characters: [constants.characters[replay.character]],
				gimmicks: {}
			}

			for (var g in levels.gimmicks) {
				self.charProgress[constants.characters[replay.character]][replay.levelname].gimmicks[g] = utils.accessGimmick(replay, g);
			}
		}

	};

	self.countObjective = function(goalData) {
		if (!goalData.count)
			return // don't know what to count, assume goalData correct otherwise

		var count = 0;

		if (goalData.count == "Beat") {
			// goalData.character, goalData.hub, goalData.leveltype
			for (var l in self.allProgress) {
				if (goalData.hub && levels.levels[l].hub != goalData.hub)
					continue;
				if (goalData.leveltype && levels.levels[l].type != goalData.leveltype)
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
				if (goalData.hub && levels.levels[l].hub != goalData.hub)
					continue;
				if (goalData.leveltype && levels.levels[l].type != goalData.leveltype)
					continue;
				if (goalData.character && (!(l in self.charProgress[goalData.character])))
					continue;
				if (goalData.character && (self.charProgress[goalData.character][l].completion < 5 || self.charProgress[goalData.character][l].finesse < 5))
					continue;
				count++;
			}
		} else if (goalData.count == "keys") {
			// goalData.hub, goalData.keytype
			if (goalData.hub) {
				count = self.keyProgress[goalData.hub][goalData.keytype] / 10;
			} else {
				count += self.keyProgress["Forest"][goalData.keytype];
				count += self.keyProgress["Mansion"][goalData.keytype];
				count += self.keyProgress["City"][goalData.keytype];
				count += self.keyProgress["Laboratory"][goalData.keytype];
				count /= 10;
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

					if (goalData.hub && levels.levels[self.allCompletes[l].level].hub != goalData.hub)
						continue;
					if (goalData.leveltype && levels.levels[self.allCompletes[l].level].type != goalData.leveltype)
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
						if (goalData.hub && levels.levels[l].hub != goalData.hub)
							continue;
						if (goalData.leveltype && levels.levels[l].type != goalData.leveltype)
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
		} /*else if (goalData.count in levels.gimmicks) {
			var levelCount = 0;
			for (var l in self.allProgress) {
				if (self.allProgress[l].gimmicks[goalData.count] > -1) {
					if (goalData.hub && levels.levels[l].hub != goalData.hub)
						continue;
					if (goalData.leveltype && levels.levels[l].type != goalData.leveltype)
						continue;
					if (goalData.character && !(l in self.charProgress[goalData.character]))
						continue;
					if (goalData.character && self.charProgress[goalData.character][l].gimmicks[goalData.count] == -1)
						continue;

					levelCount++;
					count += goalData.character ? self.charProgress[goalData.character][l].gimmicks[goalData.count] : self.allProgress[l].gimmicks[goalData.count];
				}
			}
		}*/

		return count;
	};

	return self;
};

module.exports = Player;
