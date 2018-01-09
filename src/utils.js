var getJSON = require('get-json');

var levels = require("./levels");
var constants = require('./constants');
var chance = require('./chance');

var extern = {}


extern.getHub = function(level) {
	return levels.levels[level].hub;
}

extern.getKey = function(level) {
	return levels.levels[level].key;
}

extern.getLevelType = function(level) {
	return levels.levels[level].type;
}

extern.getLevelDifficulty = function(level, objective, save) {
	var d;

	switch (levels.levels[level].type) {
		case "Tutorial":
		case "Open": d = 8; break;
		case "Wood": d = 7; break;
		case "Silver": d = 6; break;
		case "Gold": d = 5; break;
		case "Difficult": d = 4; break;
	}
	if (objective != "Beat")
		d--;
	if (levels.levels[level].type == "Difficult" && objective == "SS")
		d = 2;
	if (save == "New Game")
		d--;

	return d;
}

extern.generateGoalTotal = function(goalData, ruleset) {
	// pick good total number range based on goalData, length, difficulty
	var multiplier = 1;
	var maxR = 1;
	var minR = Math.max(0, 0.6 - ruleset.length * 0.2);

	if (goalData.leveltype) {
		multiplier *= 0.25;
		multiplier *= Math.min(4, 6 - constants.levelTypes.indexOf(goalData.leveltype) * .5 - ruleset.difficulty) * 0.25;
		multiplier *= Math.min(4, 6 - constants.levelTypes.indexOf(goalData.leveltype) * .5 - ruleset.length) * 0.25;
	} else if (goalData.keytype) {
		multiplier *= Math.min(4, 6 - constants.keys.indexOf(goalData.keytype) * .5 - ruleset.difficulty) * 0.25;
		multiplier *= Math.min(4, 6 - constants.keys.indexOf(goalData.keytype) * .5 - ruleset.length) * 0.25;
	} else {
		// default
		multiplier *= 1 - (ruleset.length - 1) * (goalData.count != "Beat" || ruleset.save == "New Game" ? 0.25 : 0.2);
		multiplier *= 1 - (ruleset.difficulty - 1) * (goalData.count != "Beat" || ruleset.save == "New Game" ? 0.2 : 0.15);
		if (goalData.character)
			multiplier *= 0.4;
	}

	if (goalData.hub && (goalData.hub != "Difficult" && goalData.hub != "Tutorial")) {
		multiplier *= 0.25;
	}

	var r = minR + Math.random() * (maxR - minR);

	var total = 1;
	if (goalData.hub && (goalData.hub == "Difficult" || goalData.hub == "Tutorial"))
		total = Math.ceil(multiplier * r * (levels.hubs[goalData.hub].levels - (goalData.hub == "Difficult" && !ruleset.yottass && goalData.count == "SS" ? 1 : 0)));
	else
		total = Math.ceil(multiplier * (r * chance[ruleset.save].total[goalData.count.toLowerCase()].range + chance[ruleset.save].total[goalData.count.toLowerCase()].minimum));

	if (total < 1)
		total = 1;

	return total;
}

extern.getReplayScore = function(replay) {
	var score = "";
	switch (replay.score_completion) {
		case 1: score += "D"; break;
		case 2: score += "C"; break;
		case 3: score += "B"; break;
		case 4: score += "A"; break;
		case 5: score += "S"; break;
	}
	switch (replay.score_finesse) {
		case 1: score += "D"; break;
		case 2: score += "C"; break;
		case 3: score += "B"; break;
		case 4: score += "A"; break;
		case 5: score += "S"; break;
	}
	return score;
}

extern.accessGimmick = function(replay, gimmick) {
	if (gimmick == "lowattack") {
		if (replay.input_super > 0) {
			return -1; // invalid
		} else {
			return replay.input_lights + 3 * replay.input_heavies;
		}
	} else {
		return replay[levels.gimmicks[gimmick].accessor];
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

extern.meetGoalGimmick = function(replay, gimmick) {
	if (gimmick.type == "apples") {
		return extern.accessGimmick(replay, gimmick.type) >= gimmick.count;
	} else if (gimmick.type == "lowattack") {
		if (replay.input_super > 0) {
			return false;
		} else {
			return extern.accessGimmick(replay, gimmick.type) <= gimmick.count;
		}
	} else {
		return extern.accessGimmick(replay, gimmick.type) <= gimmick.count;
	}
}

module.exports = extern;