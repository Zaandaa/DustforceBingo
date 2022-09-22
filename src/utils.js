var getJSON = require('get-json');

var levels = require("./levels");
var constants = require('./constants');
var chance = require('./chance');

var extern = {};
var alternateRng = false;


extern.getHub = function(d) {
	switch (d) {
		case 1: case 2: case 3: return "Mansion";
		case 5: case 10: case 11: return "Forest";
		case 13: case 14: case 15: return "City";
		case 17: case 18: case 19: return "Laboratory";
		case 21: return "Difficult";
		case 22: return "Mansion";
		case 23: return "Forest";
		case 24: return "City";
		case 25: return "Laboratory";
	}
	return "Tutorial";
}

extern.getKey = function(d) {
	switch (d) {
		case 1: return "Wood";
		case 2: return "Gold";
		case 3: return "Red";
		case 5: return "Wood";
		case 10: return "Gold";
		case 11: return "Red";
		case 13: return "Wood";
		case 14: return "Gold";
		case 15: return "Red";
		case 17: return "Wood";
		case 18: return "Gold";
		case 19: return "Red";
		case 22: case 23: case 24: case 25: return "Silver";
	}
	return null;
}

extern.getLevelType = function(d) {
	switch (d) {
		case 1: return "Open";
		case 2: return "Silver";
		case 3: return "Gold";
		case 5: return "Open";
		case 10: return "Silver";
		case 11: return "Gold";
		case 13: return "Open";
		case 14: return "Silver";
		case 15: return "Gold";
		case 17: return "Open";
		case 18: return "Silver";
		case 19: return "Gold";
		case 21: return "Difficult";
		case 22: case 23: case 24: case 25: return "Wood";
	}
	return "Tutorial";
}

extern.resetDoorHub = function(i, d) {
	var h = i % 16;
	var hub;
	switch (Math.floor(h / 4)) {
		case 0: hub = "Mansion"; break;
		case 1: hub = "Forest"; break;
		case 2: hub = "City"; break;
		case 3: hub = "Laboratory"; break;
	}
	return constants.doors[hub][extern.getLevelType(d)];
}

extern.getLevelName = function(id) {
	if (id in levels.levels)
		return levels.levels[id].level;

	// atlas name
	var words = id.split('-');
	var n = words[0];
	for (var i = 1; i < words.length - 1; i++) {
		n = n.concat(" ", words[i]);
	}
	return n;
}

extern.getKeydist = function(levelset) {
	var kd = {
		"Forest": {
			"Open": 0,
			"Wood": 0,
			"Silver": 0,
			"Gold": 0,
		},
		"Mansion": {
			"Open": 0,
			"Wood": 0,
			"Silver": 0,
			"Gold": 0,
		},
		"City": {
			"Open": 0,
			"Wood": 0,
			"Silver": 0,
			"Gold": 0,
		},
		"Laboratory": {
			"Open": 0,
			"Wood": 0,
			"Silver": 0,
			"Gold": 0,
		}
	};
	for (var l in levelset) {
		if (extern.getHub(levelset[l]) in kd)
			kd[extern.getHub(levelset[l])][extern.getLevelType(levelset[l])]++;
	}
	return kd;
}

extern.reorderLevels64 = function(ruleset) {
	var reorder = {};
	for (var i = 0; i < 64; i++) {
		reorder[Object.keys(ruleset.levelset)[constants.reorder64[i]]] = ruleset.levelset[Object.keys(ruleset.levelset)[constants.reorder64[i]]];
	}
	return reorder;
}

extern.getLevelDifficulty = function(lt, objective, newgame) {
	var d;

	switch (lt) {
		case "Tutorial":
		case "Open": d = 8; break;
		case "Wood": d = 7; break;
		case "Silver": d = 6; break;
		case "Gold": d = 5; break;
		case "Difficult": d = 4; break;
	}
	if (objective != "Beat")
		d--;
	if (lt == "Difficult" && objective == "SS")
		d = 2;
	if (newgame)
		d--;

	return d;
}

extern.checkTotalDifficultyLength = function(goalData, ruleset) {
	// return false if total is too easy/hard/short/long
	var baseMin, baseRange, baseMax;

	// special hubs
	if (goalData.hub == "Difficult") {
		if (ruleset.newgame && ruleset.length > 1)
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

		// special apple leveltype bases
		if (goalData.count == "apples") {
			baseMax *= goalData.appleType == "SS" ? 0.4 : 0.5;
			baseMin = 0;
		}

		if (goalData.count == "keys") {
			if (constants.keys.indexOf(goalData.keytype) < 2) {
				baseMax++;
				baseMin++;
			}
			if (!goalData.hub) {
				baseMax *= 4 - 0.25 * (2 * (ruleset.length - 1) + (ruleset.difficulty - 1) + constants.keys.indexOf(goalData.keytype));
				baseMin *= 2.5 - 0.125 * (2 * (ruleset.length - 1) + (ruleset.difficulty - 1) + constants.keys.indexOf(goalData.keytype));
			}
		} else {
			if (constants.levelTypes.indexOf(goalData.leveltype) < 2) {
				baseMax++;
				baseMin++;
			}
			if (!goalData.hub) {
				baseMax *= 4 - 0.25 * (2 * (ruleset.length - 1) + (ruleset.difficulty - 1) + constants.levelTypes.indexOf(goalData.leveltype));
				baseMin *= 2.5 - 0.125 * (2 * (ruleset.length - 1) + (ruleset.difficulty - 1) + constants.levelTypes.indexOf(goalData.leveltype));
				if (goalData.appleType) {
					baseMax *= goalData.appleType == "SS" ? 0.6 : 0.75;
					baseMin *= goalData.appleType == "SS" ? 0.6 : 0.75;
				}
			}
			if (goalData.character) {
				baseMax *= 0.75;
				baseMin *= 0.75;
			}
		}

		// console.log(goalData.appleType, goalData.leveltype, goalData.hub, goalData.character);
		// console.log(goalData.total, baseMin, baseMax);
		// console.log(baseMin <= goalData.total, goalData.total <= baseMax);
		return baseMin <= goalData.total && goalData.total <= baseMax;
	}

	// remaining easy types (apples/beat/ss)
	baseMin = chance[ruleset.newgame].total[goalData.count].minimum;
	baseRange = chance[ruleset.newgame].total[goalData.count].range;
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
	if (goalData.appleType == "SS") {
		baseMax *= 1 - (ruleset.difficulty - 1) * 0.25;
		baseMin *= 1 - (ruleset.difficulty - 1) * 0.25;
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
	} else if (gimmick == "lowdust") {
		return replay.tag.collected;
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