var getJSON = require('get-json');
var seedrandom = require('seedrandom');

var levels = require("./levels");
var utils = require("./utils");
var constants = require('./constants');
var chance = require('./chance');

var extern = {}

extern.makeGoals = function(ruleset) {
	seedrandom(ruleset.seed);
	var goals = [];
	var r;

	var levelGoalDatas = makeLevelGoalDatas(ruleset);
	var usedTotalGoalStrings = [];

	for (var i = 0; i < ruleset.size * ruleset.size; i++) {
		r = Math.random();
		var success = false;
		if (r < chance[ruleset.save].level.chance + ruleset.length * chance[ruleset.save].level.length_bonus) {
			// pick from levelGoalDatas
			r = Math.random() * levelGoalDatas.total;
			var chosen = false;
			var count = 0;
			var levelIndex = 0;
			var currentLevel = "";
			var goalsThisLevel = 0;
			var totalLevelDiff = 0;
			for (var g = 0; g < levelGoalDatas.data.length; g++) {
				if (!chosen) {
					count += levelGoalDatas.data[g].difficulty;

					if (levelGoalDatas.data[g].level != currentLevel) {
						currentLevel = levelGoalDatas.data[g].level;
						levelIndex = g;
					}

					if (count > r) {
						chosen = true;
						goals.push(new Goal(levelGoalDatas.data[g]));
						g = levelIndex - 1;
						continue;
					}
				} else {
					// remove all of chosen level
					if (levelGoalDatas.data[g].level != currentLevel) {
						levelGoalDatas.total -= totalLevelDiff;
						levelGoalDatas.data.splice(levelIndex, goalsThisLevel);
						success = true;
						break;
					} else {
						goalsThisLevel++;
						totalLevelDiff += levelGoalDatas.data[g].difficulty;
					}
				}
			}
		}
		if (!success && r < chance[ruleset.save].total.chance) {
			var newData = makeTotalGoalData(ruleset);
			var newString = makeGoalString(newData);
			while (usedTotalGoalStrings.includes(newString)) {
				newData = makeTotalGoalData(ruleset);
				newString = makeGoalString(newData);
			}

			usedTotalGoalStrings.push(newString);
			goals.push(new Goal(newData));
		}
	}

	return goals;
}

function makeLevelGoalDatas(ruleset) {
	var validGoalDatas = [];
	var totalDifficulty = 0;

	for (var l in levels.levels) {
		if (!ruleset.tutorials && levels.levels[l].hub == "Tutorial")
			continue;
		if (!ruleset.difficults && levels.levels[l].hub == "Difficult")
			continue;

		constants.objectives.forEach(function(o) {

			if (o == "S finesse" && !ruleset.sfinesse)
				return;
			if (o == "S complete" && !ruleset.scomplete)
				return;
			if (o == "B complete" && !ruleset.bcomplete)
				return;
			if (o == "D complete" && !ruleset.dcomplete)
				return;

			if (levels.levels[l].type == "Difficult" && ruleset.save == "New Game" && ruleset.length > 1)
				return; // no difficults in new game unless full game length
			if (l == "Yotta Difficult" && (o == "SS") && !ruleset.yottass)
				return;

			var d = utils.getLevelDifficulty(l, o, ruleset.save);
			if (d < ruleset.difficulty || d > ruleset.maxEasy)
				return;
			validGoalDatas.push({type: "level", level: l, objective: o, difficulty: d});
			totalDifficulty += d;

			if (ruleset.characters && levels.levels[l].charselect && d - 1 >= ruleset.difficulty) {
				constants.characters.forEach(function(c) {
					validGoalDatas.push({type: "level", level: l, objective: o, difficulty: d / 4, character: c})
					totalDifficulty += d / 4;
				});
			}
		});

		levels.levels[l].gimmicks.forEach(function(g) {
			if (!ruleset[g.type])
				return;
			if (g.difficulty < ruleset.difficulty)
				return;
			if (!ruleset.characters && g.character)
				return;
			validGoalDatas.push({type: "level", level: l, objective: g.objective, difficulty: g.difficulty, character: g.character, gimmicks: [g]});
			totalDifficulty += g.difficulty;
		});
	}

	return {data: validGoalDatas, total: totalDifficulty};
}

function makeTotalGoalData(ruleset) {
	var goalData = {type: "total"};
	var r;

	r = Math.random();
	if (r < chance[ruleset.save].total.beat.chance)
		goalData.count = "Beat";
	else if (r < chance[ruleset.save].total.ss.chance)
		goalData.count = "SS";
	else if (r < chance[ruleset.save].total.keys.chance) {
		goalData.count = "keys";
		goalData.keytype = constants.keys[Math.floor(Math.random() * 4)];
	}
	else if (r < chance[ruleset.save].total.apples.chance && ruleset.apples)
		goalData.count = "apples";
	else
		goalData.count = "Beat";


	r = Math.random();
	if (r < chance[ruleset.save].total.hub) {
		goalData.hub = Object.keys(levels.hubs)[Math.floor(Math.random() * 6)];
		while (true) {
			var hubNeedsKeys = goalData.count == "keys" && !levels.hubs[goalData.hub].keys;
			var hubNeedsApples = goalData.count == "apples" && !levels.hubs[goalData.hub].apples;
			var hubTutorial = goalData.hub == "Tutorial" && !ruleset.tutorials;
			var hubDifficult = goalData.hub == "Difficult" && !ruleset.difficults;
			var tooHard = goalData.hub == "Difficult" && (ruleset.difficulty == 4 || !(ruleset.mode == "New Game" && ruleset.length == 1 && ruleset.difficulty <= 2));
			if (hubNeedsKeys || hubNeedsApples || hubTutorial || hubDifficult || tooHard)
				goalData.hub = Object.keys(levels.hubs)[Math.floor(Math.random() * 6)];
			else
				break;
		}
	}

	if (goalData.count != "keys" && ruleset.characters && !(goalData.hub && !levels.hubs[goalData.hub].charselect)) {
		r = Math.random();
		if (r < chance[ruleset.save].total.character) {
			goalData.character = constants.characters[Math.floor(Math.random() * constants.characters.length)];
		}
	}

	if (goalData.count == "Beat" || goalData.count == "SS") {
		if (goalData.hub && levels.hubs[goalData.hub].keys) {
			r = Math.random();
			if (r < chance[ruleset.save].total.leveltype) {
				goalData.leveltype = constants.levelTypes[Math.floor(Math.random() * constants.levelTypes.length)];
			}
		}
	}

	goalData.total = utils.generateGoalTotal(goalData, ruleset);

	return goalData;
}

function makeGoalString(goalData) {
	var str = "";

	if (goalData.type == "level") {
		str = goalData.objective + " " + goalData.level;

		if (goalData.character)
			str += " as " + goalData.character;

		if (goalData.gimmicks) {
			goalData.gimmicks.forEach(function(g) {
				str += " with " + levels.gimmicks[g.type].format.replace("{count}", g.count) + (g.count != 1 ? levels.gimmicks[g.type].plural : "");
			});
		}

	} else if (goalData.type == "total") {
		switch (goalData.count) {
			case "Beat":
			case "SS": str = goalData.count + " " + goalData.total.toString() + (goalData.leveltype ? (" " + goalData.leveltype) : "") + " level" + (goalData.total > 1 ? "s" : ""); break;
			case "apples": str = "Hit " + goalData.total.toString() + " apple" + (goalData.total > 1 ? "s" : ""); break;
			case "keys": str = "Get " + goalData.total.toString() + " " + goalData.keytype + " key" + (goalData.total > 1 ? "s" : ""); break;
		}

		if (goalData.hub)
			str += " in " + goalData.hub;
		if (goalData.character)
			str += " as " + goalData.character;
	}

	return str;
}

var Goal = function(goalData) {
	var self = this;
	self.goalData = goalData;
	self.goalString = makeGoalString(goalData);
	self.achieved = [];

	self.toString = function() {
		return self.goalString;
	};

	self.getBoardData = function() {
		return {title: self.goalString, achieved: self.achieved};
	};

	self.isAchieved = function() {
		return self.achieved.length > 0;
	};

	self.addAchiever = function(a) {
		self.achieved.push(a);
	};

	self.compareReplay = function(replay, player) {
		// check if replay meets goalData

		if (self.goalData.type == "level") {
			if (self.goalData.level == replay.levelname) {
				var score = utils.getReplayScore(replay);
				if (self.goalData.objective == "SS" && score != "SS")
					return false;

				if (self.goalData.objective == "S finesse" && score[1] != "S")
					return false;
				if (self.goalData.objective == "S complete" && score[0] != "S")
					return false;
				if (self.goalData.objective == "B complete" && score[0] != "B")
					return false;
				if (self.goalData.objective == "D complete" && score[0] != "D")
					return false;

				if (self.goalData.character && self.goalData.character != constants.characters[replay.character])
					return false;

				for (var g in self.goalData.gimmicks) {
					if (!utils.meetGoalGimmick(replay, self.goalData.gimmicks[g]))
						return false;
				}

				return true;
			}
		} else {
			// total, check against player.countObjective(kwargs)

			// >= beat, ss, apples, keys
			if (player.countObjective(self.goalData) >= self.goalData.total) {
				return true;
			}

			// <= low gimmicks (unused)

		}

		return false;
	};

	return self;
};

module.exports = extern;