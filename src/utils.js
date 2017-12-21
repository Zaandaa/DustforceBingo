var levels = require("./levels");

var extern = {}

extern.getLevelDifficulty = function(level, objective) {
	var d = objective == "Beat" ? 5 : 3;

	switch (levels.levels[level].type) {
		case "Tutorial":
		case "Open": 
		case "Wood": d++;
		case "Silver": d++;
		case "Gold": d++;
	}
	return d;
}

extern.generateGoalTotal = function(goalData, ruleset) {
	// pick good total number range based on goalData and ruleset length/difficulty
	return 2;

	/*/ pick range for multiplier based on stuff
	

	// calculate multiplier
	var multiplier = Math.random();

	// calculate total based on stuff, using multiplier
	var total = Math.floor(multiplier * chances[ruleset.save].total[countType.toLowerCase()].range) + chances[ruleset.save].total[countType.toLowerCase()].minimum;

	if hub
		if (goalData.hub == "Difficult" || goalData.hub == "Tutorial")
			total = Math.ceil(multiplier * (levels.hubs[goalData.hub].levels - (!ruleset.yottass && goalData.count == "SS" ? 1 : 0)));
		else
			total = Math.ceil(goalData.total / 4);

	return total;*/
}



extern.accessGimmick = function(replay, gimmick) {
	if (gimmick == "lowpercent") {
		return replay.meta.tags.collected;
	} else if (gimmick == "lowattack") {
		if (replay.meta.input_super > 0) {
			return -1; // invalid
		} else {
			return replay.meta.input_lights + 3 * replay.meta.input_heavies;
		}
	} else {
		return replay.meta[levels.gimmicks[gimmick].accessor];
	}
}

extern.betterGimmick = function(gimmick, g1, g2) {
	if (gimmick == "apples") {
		return Math.max(g1, g2);
	} else {
		// ignore invalid negatives
		// both could be negative, something else handles that
		if (g1 < 0) {
			return g2;
		} else if (g2 < 0) {
			return g1;
		}
		return Math.min(g1, g2);
	}
}

extern.meetGoalGimmick = function(replay, gimmick, goalRequirement) {
	if (gimmick == "apples") {
		return extern.accessGimmick(replay, gimmick) >= goalRequirement;
	} else if (gimmick == "lowattack") {
		if (replay.meta.input_super > 0) {
			return false;
		} else {
			return extern.accessGimmick(replay, gimmick) <= goalRequirement;
		}
	} else {
		return extern.accessGimmick(replay, gimmick) <= goalRequirement;
	}
}

module.exports = extern;