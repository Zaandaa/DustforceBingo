var getJSON = require('get-json');

var levels = require('./levels');
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
		if (replay.meta.levelname in self.levelProgress) {
			// score + keys
			if (self.levelProgress[replay.meta.levelname].completion < replay.meta.score_completion) {
				if (constants.hubs.includes(levels.levels[replay.meta.levelname].hub))
					self.keyProgress[levels.levels[replay.meta.levelname].hub][levels.levels[replay.meta.levelname].key] += replay.meta.score_completion - self.levelProgress[replay.meta.levelname].completion;
				self.levelProgress[replay.meta.levelname].completion = replay.meta.score_completion;
			}
			if (self.levelProgress[replay.meta.levelname].finesse < replay.meta.score_finesse) {
				if (constants.hubs.includes(levels.levels[replay.meta.levelname].hubs))
					self.keyProgress[levels.levels[replay.meta.levelname].hub][levels.levels[replay.meta.levelname].key] += replay.meta.score_finesse - self.levelProgress[replay.meta.levelname].finesse;
				self.levelProgress[replay.meta.levelname].finesse = replay.meta.score_finesse;
			}
			// if char not in chars, add char to chars
			if (!self.levelProgress[replay.meta.levelname].characters.includes(constants.characters[replay.meta.character])) {
				self.levelProgress[replay.meta.levelname].characters.push(constants.characters[replay.meta.character]);
			}
			// better gimmicks
			for (var g in levels.gimmicks) {
				self.levelProgress[replay.meta.levelname].gimmicks[g] = utils.betterGimmick(g, utils.accessGimmick(replay, g), self.levelProgress[replay.meta.levelname].gimmicks[g]);
			}
		} else {
			self.levelProgress[replay.meta.levelname] = {
				completion: replay.meta.score_completion,
				finesse: replay.meta.score_finesse,
				chars: [constants.characters[replay.meta.character]],
				gimmicks: {}
			}
			if (constants.hubs.includes(levels.levels[replay.meta.levelname].hub))
				self.keyProgress[levels.levels[replay.meta.levelname].hub][levels.levels[replay.meta.levelname].key] = replay.meta.score_completion + replay.meta.score_finesse;

			for (var g in levels.gimmicks) {
				self.levelProgress[replay.meta.levelname].gimmicks[g] = utils.accessGimmick(replay, g.type);
			};
		}
	};

	self.countObjective = function(goalData) {
		if (!goalData.count)
			return // don't know what to count, assume goalData correct otherwise

		var count = 0;

		if (goalData.count == "Beat") {
			// goalData.character, goalData.hub, goalData.type
			for (var l in self.levelProgress) {
				if (goalData.hub && levels.levels[l].hub != goalData.hub)
					continue;
				if (goalData.type && levels.levels[l].type != goalData.type)
					continue;
				if (goalData.character && self.levelProgress[l].chars.includes(goalData.character))
					continue;
				count++;
			}
		} else if (goalData.count == "SS") {
			// goalData.character, goalData.hub, goalData.type
			for (var l in self.levelProgress) {
				if (goalData.hub && levels[l].hub != goalData.hub)
					continue;
				if (goalData.type && levels[l].type != goalData.leveltype)
					continue;
				if (goalData.character && self.levelProgress[l].chars.includes(goalData.character))
					continue;
				if (self.levelProgress[l].completion < 5 || self.levelProgress[i].finesse < 5)
					continue;
				count++;
			}
		} else if (goalData.count == "keys") {
			// goalData.hub, goalData.type
			if (goalData.hub) {
				count = self.keyProgress[hub][type];
			} else {
				count += self.keyProgress["Forest"][type];
				count += self.keyProgress["Mansion"][type];
				count += self.keyProgress["City"][type];
				count += self.keyProgress["Laboratory"][type];
			}
		} else if (goalData.count in meta.gimmicks) {
			for (var l in self.levelProgress) {
				if (self.levelProgress[l].gimmicks[goalData.count] > -1) {
					count += self.levelProgress[l].gimmicks[goalData.count];
				}
			}
		}

		return count;
	};

	return self;
};

module.exports = Player;
