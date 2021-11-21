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

	self.goalsAchieved = []; // list of ids of goals achieved
	self.allProgress = {};
	self.keyProgress = {
		"Forest": {"Wood": 0, "Silver": 0, "Gold": 0, "Red": 0},
		"Mansion": {"Wood": 0, "Silver": 0, "Gold": 0, "Red": 0},
		"City": {"Wood": 0, "Silver": 0, "Gold": 0, "Red": 0},
		"Laboratory": {"Wood": 0, "Silver": 0, "Gold": 0, "Red": 0},
	};

	self.toString = function() {
		return self.name;
	};

	self.getBoardData = function() {
		return {id: self.id, name: self.name, team: self.team, ready: self.ready, reset: self.reset, color: self.color, goals: self.goalsAchieved.length};
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

	self.changeColor = function(c) {
		if (c != self.color) {
			self.color = c;
			return true;
		}
		return false;
	};

	self.resetVars = function() {
		self.voteReset(false);
		self.setReady(false);

		self.goalsAchieved = [];
		self.allProgress = {};
		self.keyProgress = {
			"Forest": {"Wood": 0, "Silver": 0, "Gold": 0, "Red": 0},
			"Mansion": {"Wood": 0, "Silver": 0, "Gold": 0, "Red": 0},
			"City": {"Wood": 0, "Silver": 0, "Gold": 0, "Red": 0},
			"Laboratory": {"Wood": 0, "Silver": 0, "Gold": 0, "Red": 0},
		};
	};

	self.achieveGoal = function(id) {
		if (!self.goalsAchieved.includes(id))
			self.goalsAchieved.push(id);
	};

	self.addProgress = function(replay, door) {
		if (replay.validated == -9)
			return;

		// allProgress and keyProgress
		if (replay.level in self.allProgress) {
			// score + keys
			if (self.allProgress[replay.level].completion < replay.score_completion) {
				if (levels.hubs[utils.getHub(door)].keys)
					self.keyProgress[utils.getHub(door)][utils.getKey(door)] += replay.score_completion - self.allProgress[replay.level].completion;
					self.keyProgress[utils.getHub(door)][utils.getKey(door)] += replay.score_completion - self.allProgress[replay.level].completion;
				self.allProgress[replay.level].completion = replay.score_completion;
			}
			if (self.allProgress[replay.level].finesse < replay.score_finesse) {
				if (levels.hubs[utils.getHub(door)].keys)
					self.keyProgress[utils.getHub(door)][utils.getKey(door)] += replay.score_finesse - self.allProgress[replay.level].finesse;
				self.allProgress[replay.level].finesse = replay.score_finesse;
			}

		} else {
			self.allProgress[replay.level] = {
				completion: replay.score_completion,
				finesse: replay.score_finesse,
			}

			if (levels.hubs[utils.getHub(door)].keys)
				self.keyProgress[utils.getHub(door)][utils.getKey(door)] += replay.score_completion + replay.score_finesse;

		}

	};

	self.countKeys = function(goalData) {
		if (goalData.count != "keys")
			return 0; // don't know what to count, assume goalData correct otherwise

		var count = 0;

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

		return count;
	};

	return self;
};

module.exports = Player;
