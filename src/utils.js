var getJSON = require('get-json');

var levels = require("./levels");
var constants = require('./constants');
var chance = require('./chance');

var extern = {};
var alternateRng = false;


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

extern.checkTotalDifficultyLength = function(goalData, ruleset) {
	// return false if total is too easy/hard/short/long
	var baseMin, baseRange, baseMax;

	// special hubs
	if (goalData.hub == "Difficult") {
		if (ruleset.save == "New Game" && ruleset.length > 1)
			return false;
		if (ruleset.difficulty > 2 || ruleset.difficulty == 2 && goalData.count == "SS")
			return false;
		return true;
	} else if (goalData.hub == "Tutorial") {
		if (ruleset.difficulty < goalData.count == "SS" ? 2 : 3)
			return false;
		return true;
	}

	// keys and leveltypes special ranges
	if (goalData.keytype || goalData.leveltype) {
		baseMax = 5 - 0.5 * (ruleset.difficulty + ruleset.length);
		baseMin = baseMax - 2;
		if (goalData.count == "keys") {
			if (constants.keys.indexOf(goalData.keytype) < 2) {
				baseMax++;
				baseMin++;
			}
			if (!goalData.hub) {
				baseMax *= 2 + 0.5 * (4 - ruleset.length);
				baseMin *= 1 + 0.5 * (4 - ruleset.length);
			}
		} else {
			if (constants.levelTypes.indexOf(goalData.leveltype) < 2) {
				baseMax++;
				baseMin++;
			}
			if (!goalData.hub) {
				baseMax *= 2 + 0.5 * (4 - ruleset.length);
				baseMin *= 1 + 0.5 * (4 - ruleset.length);
			}
			if (goalData.character) {
				baseMax *= 0.75;
				baseMin *= 0.75;
			}
		}
		return baseMin <= goalData.total && goalData.total <= baseMax;
	}

	// remaining easy types (apples/beat/ss)
	baseMin = chance[ruleset.save].total[goalData.count].minimum;
	baseRange = chance[ruleset.save].total[goalData.count].range;
	baseMax = baseMin + baseRange;

	// up baseMin for long lengths
	baseMin += baseRange * Math.max(0, 0.375 - ruleset.length * 0.125);

	// don't alter apple numbers because of character as much
	var charAppleModifier = goalData.count == "apples" ? 0.5 : 1;
	var noHubMax = (goalData.count == "SS" || goalData.appleType == "SS") ? 0.75 : 0.875;

	if (goalData.hub) {
		baseMax *= 0.25 - ((ruleset.difficulty - 1) + 2 * (ruleset.length - 1)) * 0.0075;
		baseMin *= 0.25 - ((ruleset.difficulty - 1) + 2 * (ruleset.length - 1)) * 0.0075;
	} else {
		baseMax *= noHubMax - ((ruleset.difficulty - 1) + 2 * (ruleset.length - 1)) * 0.075;
		baseMin *= noHubMax - ((ruleset.difficulty - 1) + 2 * (ruleset.length - 1)) * 0.075;
	}
	if (goalData.character) {
		baseMax *= 1 - (1.5 * (ruleset.difficulty - 1) + 2 * (ruleset.length - 1)) * 0.075 * charAppleModifier;
		baseMin *= 1 - (1.5 * (ruleset.difficulty - 1) + 2 * (ruleset.length - 1)) * 0.075 * charAppleModifier;
	} else {
		baseMax *= 1 - ((ruleset.difficulty - 1) + 2 * (ruleset.length - 1)) * 0.075;
		baseMin *= 1 - ((ruleset.difficulty - 1) + 2 * (ruleset.length - 1)) * 0.075;
	}

	return baseMin <= goalData.total && goalData.total <= baseMax;
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


extern.pad = function (direction, string, length) {
	string = "" + string;
	
	if(string.length >= length)
		return string;

	var padding = new Array(length - string.length + 1).join(" ");
	
	return direction == "left" ? padding + string : string + padding;
}

module.exports = extern;