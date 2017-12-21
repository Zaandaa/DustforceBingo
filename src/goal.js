var $ = require('jQuery');
var getJSON = require('get-json');
var seedrandom = require('seedrandom');

var levels = require("./levels");
var utils = require("./utils");
var constants = require('./constants');
var chance = require('./chance');

/*
card types

type: single (level), total (keys, levels beaten, levels SSed, apples)
single: level, "SS" or "Beat", from hub (else any), as char, "apple"
total: x, "Beat" or "SS" or "key" or "apples", from hub (else any), as char (else any), level types


beat/ss/other level (as char) (with any/all apples)
obtain x keys
beat x hub keys vs beat x hub key levels?
beat/ss x levels (as char)
beat/ss x hub levels (as char)
hit x apples in hub/total
no/low dash/jump/direction (need to know if possible for 0 or minimum possible)

goal object?
toString
goalData
achieved
who achieved

*/

var extern = {}

extern.makeGoals = function(ruleset) {
	seedrandom(ruleset.seed);
	var goals = [];
	var goalDatas = [];
	var r;

	var levelGoalDatas = makeLevelGoalDatas(ruleset);
	var usedTotalGoalStrings = [];

	for (var i = 0; i < ruleset.size * ruleset.size; i++) {
		r = Math.random();
		if (r < chance[ruleset.save].level.chance) {
			// pick from levelGoalDatas
			r = Math.random() * levelGoalDatas.total;
			var count = 0;
			for (var g = 0; g < levelGoalDatas.data.length; g++) {
				count += levelGoalDatas.data[g].difficulty;
				if (count > r) {
					levelGoalDatas.total -= levelGoalDatas.data[g].difficulty;
					goals.push(new Goal(levelGoalDatas.data[g]));
					levelGoalDatas.data.splice(g, 1);
					break;
				}
			}
		} else { // total
			var newData = makeTotalGoalData(ruleset);
			var newString = makeGoalString(newData);
			while ($.inArray(newString, usedTotalGoalStrings) != -1) {
				newData = makeTotalGoalData();
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

		["Beat", "BS", "SS"].forEach(function(o) {

			if (o == "BS" && !ruleset.somepercent) // somepercent
				return;
			if (l == "Yotta Difficult" && (o == "SS" || o == "BS") && !ruleset.yottass)
				return;

			var d = utils.getLevelDifficulty(l, o);
			if (d < ruleset.difficulty)
				return;
			validGoalDatas.push({type: "level", objective: o, difficulty: d});
			totalDifficulty += d;

			if (ruleset.characters) {
				constants.characters.forEach(function(c) {
					validGoalDatas.push({type: "level", objective: o, difficulty: d, character: c})
					totalDifficulty += d;
				});
			}
		});

		Object.keys(levels.gimmicks).forEach(function(g) {
			return;
			if (!ruleset[g])
				return;

			var g_count = Object.keys(levels.levels[l].gimmicks[g]).length;
			levels.levels[l].gimmicks[g].forEach(function(gg) {
				if (gg.difficulty < ruleset.difficulty)
					return;
				validGoalDatas.push({type: "level", objective: gg.type, difficulty: gg.difficulty / gCount, gimmicks: [g]});
				totalDifficulty += gg.difficulty / gCount;
			});
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
	else if (r < chance[ruleset.save].total.apples.chance)
		goalData.count = "apples";
	else if (r < chance[ruleset.save].total.keys.chance)
		goalData.count = "keys";

	r = Math.random();
	if (r < chance[ruleset.save].total.hub) {
		goalData.hub = Object.keys(levels.hubs)[Math.floor(Math.random() * 6)];
		while (goalData.count == "keys" && !levels.hubs[goalData.hub].keys || goalData.hub == "Tutorial" && !ruleset.tutorials || goalData.hub == "Difficult" && (!ruleset.difficults || ruleset.mode == "newgame" && (ruleset.length > 0.5 || ruleset.difficulty < 4))) {
			goalData.hub = Object.keys(levels.hubs)[Math.floor(Math.random() * 6)];
		}
	}

	if (goalData.count == "Beat" && ruleset.characters) {
		r = Math.random();
		if (r < chance[ruleset.save].total.character) {
			goalData.character = constants.characters[Math.floor(Math.random() * constants.characters.length)];
		}
	}

	if (goalData.count == "Beat" || goalData.count == "SS") {
		if (goalData.hub && levels.hubs[goalData.hub].keys) {
			r = Math.random();
			if (r < chance[ruleset.save].total.leveltype) {
				goalData.leveltype = constants.hubs[Math.floor(Math.random() * leveltypes.length)];
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

		goalData.gimmicks.forEach(function(g) {
			str += " with " + g.total.toString() + g.format + (g.total != 1 ? g.plural : "")
		});

	} else if (goalData.type == "total") {
		switch (goalData.count) {
			case "Beat":
			case "SS": str = goalData.count + " " + goalData.total.toString() + (goalData.leveltype ? (" " + goalData.leveltype) : "") + " level" + (goalData.total > 1 ? "s" : ""); break;
			case "apples": str = "Hit " + goalData.total.toString() + " apple" + (goalData.total > 1 ? "s" : ""); break;
			case "keys": str = "Get " + goalData.total.toString() + " key" + (goalData.total > 1 ? "s" : ""); break;
		}

		if (goalData.hub)
			str += " in " + goalData.hub;
		if (goalData.character)
			str += " as " + goalData.character;
	}

	return str;
}

var Goal = function(goalData, goalString) {
	var self = this;
	self.goalData = goalData;
	self.goalString = goalString;
	self.achieved = [];

	self.toString = function() {
		return self.goalString;
	};

	self.getBoardData = function() {
		return {title: self.goalString, achieved: self.achieved.toString()};
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
			if (self.goalData.level == replay.meta.levelname) {
				if (self.goalData.objective == "SS" && (replay.meta.score_completion != 5 || replay.meta.score_finesse != 5))
					return false;
				if (self.goalData.character && self.goalData.character != constants.characters[replay.meta.character])
					return false;

				for (var g in self.goalData.gimmicks) {
					if (!meetGoalGimmick(replay, g, self.goalData.gimmicks[g]))
						return false;
				}

				return true;
			}
		} else {
			// total, check against player.countObjective(kwargs)

			// >= beat, ss, apples, keys
			if (player.countObjective(goalData) >= self.goalData.total) {
				return true;
			}

			// <= low gimmicks (unused)

		}

		return false;
	};

	return self;
};

module.exports = extern;