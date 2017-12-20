var seedrandom = require('seedrandom');

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
		if (r < chances[ruleset.savefile].level.chance) {
			// pick from levelGoalDatas
			r = Math.random() * levelGoalDatas.total;
			var count = 0;
			for (var g = 0; g < levelGoalDatas.data.length; g++) {
				count += levelGoalDatas.data[g].difficulty;
				if (count > r) {
					levelGoalDatas.total -= levelGoalDatas.data[g].difficulty;
					goals.push(new Goal(levelGoalDatas.data[g]));
					levelGoalDatas.data.remove(g);
					break;
				}
			}
		} else { // total
			var newData = makeTotalGoalData();
			var newString = makeGoalString(newData);
			while ($.inArray(gdString, usedTotalGoalStrings) != -1) {
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

	for (var l in levels) {

		if (!ruleset.includeTutorials && levels.levels[l].hub == "Tutorial")
			continue;
		if (!ruleset.includeDifficults && levels.levels[l].hub == "Difficult")
			continue;

		["Beat", "BS", "SS"].forEach(function(o) {

			if (o == "BS" && !ruleset.somepercent) // somepercent
				return;
			if (l == "Yotta Difficult" && (o == "SS" || o == "BS") && ruleset.noYotta)
				return;

			var d = getLevelDifficulty(levels[l], o);
			if (d < ruleset.minDifficulty || d > ruleset.maxDifficulty)
				return;
			validGoalDatas.push({type: "level", objective: o, difficulty: d});
			totalDifficulty += d;

			characters.forEach(function(c) {
				validGoalDatas.push({type: "level", objective: o, difficulty: d, character: c})
				totalDifficulty += d;
			});

		});

		Object.keys(levels.gimmicks).forEach(function(g) {
			return;
			if (!ruleset[g])
				return;

			var g_count = Object.keys(levels.levels[l].gimmicks[g]).length;
			levels.levels[l].gimmicks[g].forEach(function(gg) {
				if (gg.difficulty < ruleset.minDifficulty || gg.difficulty > ruleset.maxDifficulty)
					return;
				validGoalDatas.push({type: "level", objective: gg.type, difficulty: gg.difficulty / gCount, gimmicks: [g]});
				totalDifficulty += gg.difficulty / gCount;
			});
		});
	}

	return {data: validGoalDatas, total: totalDifficulty};
}

function makeTotalGoalData() {
	var goalData = {type: "total"};
	var r;

	r = Math.random();
	if (r < chances[mode].total.beat.chance)
		goalData.count = "Beat";
	else if (r < chances[mode].total.ss.chance)
		goalData.count = "SS";
	else if (r < chances[mode].total.apples.chance)
		goalData.count = "apples";
	else if (r < chances[mode].total.keys.chance)
		goalData.count = "keys";

	r = Math.random();
	if (r < chances[mode].total.hub) {
		goalData.hub = levels.hubs.keys()[Math.floor(Math.random() * 6)];
		while (goalData.count == "keys" && !levels.hubs[goalData.hub].keys || goalData.hub == "Tutorial" && !ruleset.includeTutorials || goalData.hub == "Difficult" && (!ruleset.includeDifficults || ruleset.mode == "newgame" && (ruleset.length > 0.5 || ruleset.minDifficulty < 4))) {
			goalData.hub = levels.hubs.keys()[Math.floor(Math.random() * 6)];
		}
	}

	if (goalData.count == "Beat") {
		r = Math.random();
		if (r < chances[mode].total.character) {
			goalData.character = characters[Math.floor(Math.random() * characters.length)];
		}
	}

	if (goalData.count == "Beat" || goalData.count == "SS") {
		if (goalData.hub && levels.hubs[goalData.hub].keys) {
			r = Math.random();
			if (r < chances[mode].total.leveltype) {
				goalData.leveltype = hubs[Math.floor(Math.random() * leveltypes.length)];
			}
		}
	}

	goalData.total = generateGoalTotal(goalData, ruleset);

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
				if (self.goalData.character && self.goalData.character != characters[replay.meta.character])
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