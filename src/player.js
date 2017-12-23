var getJSON = require('get-json');

var levels = require('./levels');
var utils = require('./utils');
var constants = require('./constants');

var Player = function(id, name) {
	var self = this;
	self.id = id;
	self.name = name;
	self.color = "FFFFFF";
	self.ready = false;

	self.goalsAchieved = []; // list of ids of goals achieved
	self.levelProgress = {}; // dictionary of levels beaten
	self.keyProgress = {
		"Forest": {"Wood": 0, "Silver": 0, "Gold": 0, "Ruby": 0},
		"Mansion": {"Wood": 0, "Silver": 0, "Gold": 0, "Ruby": 0},
		"City": {"Wood": 0, "Silver": 0, "Gold": 0, "Ruby": 0},
		"Laboratory": {"Wood": 0, "Silver": 0, "Gold": 0, "Ruby": 0},
	};

	// used by bingo for lockout forced win checking
	self.bingos = 0;
	self.maxBingos = 0;
	self.maxGoals = 0;
	self.canWin = true;

	self.toString = function() {
		return self.name;
	};

	self.getBoardData = function() {
		return {name: self.name, color: self.color, goals: self.goalsAchieved.length};
	};

	self.getReady = function() {
		return self.ready;
	};

	self.setReady = function(r) {
		self.ready = r;
	};

	self.achieveGoal = function(id) {
		return self.goalsAchieved.push(id);
	};

	self.addProgress = function(replay) {
		if (replay.levelname in self.levelProgress) {
			// score + keys
			if (self.levelProgress[replay.levelname].completion < replay.score_completion) {
				if (constants.hubs.includes(levels.levels[replay.levelname].hub))
					self.keyProgress[levels.levels[replay.levelname].hub][levels.levels[replay.levelname].key] += replay.score_completion - self.levelProgress[replay.levelname].completion;
				self.levelProgress[replay.levelname].completion = replay.score_completion;
			}
			if (self.levelProgress[replay.levelname].finesse < replay.score_finesse) {
				if (constants.hubs.includes(levels.levels[replay.levelname].hubs))
					self.keyProgress[levels.levels[replay.levelname].hub][levels.levels[replay.levelname].key] += replay.score_finesse - self.levelProgress[replay.levelname].finesse;
				self.levelProgress[replay.levelname].finesse = replay.score_finesse;
			}
			// if character not in characters, add character to characters
			if (!self.levelProgress[replay.levelname].characters.includes(constants.characters[replay.character])) {
				self.levelProgress[replay.levelname].characters.push(constants.characters[replay.character]);
			}
			// better gimmicks
			for (var g in levels.gimmicks) {
				self.levelProgress[replay.levelname].gimmicks[g] = utils.betterGimmick(g, utils.accessGimmick(replay, g), self.levelProgress[replay.levelname].gimmicks[g]);
			}
		} else {
			self.levelProgress[replay.levelname] = {
				completion: replay.score_completion,
				finesse: replay.score_finesse,
				characters: [constants.characters[replay.character]],
				gimmicks: {}
			}
			if (constants.hubs.includes(levels.levels[replay.levelname].hub))
				self.keyProgress[levels.levels[replay.levelname].hub][levels.levels[replay.levelname].key] += replay.score_completion + replay.score_finesse;

			for (var g in levels.gimmicks) {
				self.levelProgress[replay.levelname].gimmicks[g] = utils.accessGimmick(replay, g);
			}
		}
	};

	self.countObjective = function(goalData) {
		if (!goalData.count)
			return // don't know what to count, assume goalData correct otherwise

		var count = 0;

		if (goalData.count == "Beat") {
			// goalData.character, goalData.hub, goalData.leveltype
			for (var l in self.levelProgress) {
				if (goalData.hub && levels.levels[l].hub != goalData.hub)
					continue;
				if (goalData.leveltype && levels.levels[l].type != goalData.leveltype)
					continue;
				if (goalData.character && self.levelProgress[l].characters.includes(goalData.character))
					continue;
				count++;
			}
		} else if (goalData.count == "SS") {
			// goalData.character, goalData.hub, goalData.leveltype
			for (var l in self.levelProgress) {
				if (goalData.hub && levels.levels[l].hub != goalData.hub)
					continue;
				if (goalData.leveltype && levels.levels[l].leveltype != goalData.leveltype)
					continue;
				if (goalData.character && self.levelProgress[l].characters.includes(goalData.character))
					continue;
				if (self.levelProgress[l].completion < 5 || self.levelProgress[l].finesse < 5)
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
		} else if (goalData.count in levels.gimmicks) {
			var levelCount = 0;
			for (var l in self.levelProgress) {
				if (self.levelProgress[l].gimmicks[goalData.count] > -1) {
					if (goalData.hub && levels.levels[l].hub != goalData.hub)
						continue;
					if (goalData.leveltype && levels.levels[l].leveltype != goalData.leveltype)
						continue;
					levelCount++;
					count += self.levelProgress[l].gimmicks[goalData.count];
				}
			}
		}

		return count;
	};

	return self;
};

module.exports = Player;
