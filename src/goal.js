var getJSON = require('get-json');
var seedrandom = require('seedrandom');
var shuffle = require('./shuffle');

var levels = require("./levels");
var utils = require("./utils");
var constants = require('./constants');
var chance = require('./chance');

var extern = {};


extern.makeGoals = function(ruleset, bingos) {
	seedrandom();
	var goals = [];
	for (var i = 0; i < ruleset.size * ruleset.size; i++) {
		goals.push(undefined);
	}
	var r;

	var levelGoalDatas = makeLevelGoalDatas(ruleset);
	var totalGoalDatas = makeTotalGoalDatas(ruleset);

	var usedGoalStats = {
		levels: 0,
		totals: 0,
		characters: {"Dustman": 0, "Dustgirl": 0, "Dustkid": 0, "Dustworth": 0, undefined: 0},
		hubs: {"Tutorial": 0, "Forest": 0, "Mansion": 0, "City": 0, "Laboratory": 0, "Difficult": 0, undefined: 0},
		leveltypes: {"Tutorial": 0, "Open": 0, "Wood": 0, "Silver": 0, "Gold": 0, "Difficult": 0},
		levelObjectives: {},
		totalObjectives: {},
		levelObjectiveWeights: {},
		totalObjectiveWeights: {},
		levelObjectiveWeightTotal: 0,
		totalObjectiveWeightTotal: 0,
		levelWeightsInObjective: {},
		totalWeightsInObjective: {},
		totalAlternate: Math.random() < 0.5
	};
	for (var o in constants.levelObjectives) {
		usedGoalStats.levelObjectives[constants.levelObjectives[o]] = 0;
		usedGoalStats.levelObjectiveWeights[constants.levelObjectives[o]] = 0;
		usedGoalStats.levelWeightsInObjective[constants.levelObjectives[o]] = 0;
	}
	for (var o in constants.totalObjectives) {
		usedGoalStats.totalObjectives[constants.totalObjectives[o]] = 0;
		usedGoalStats.totalObjectiveWeights[constants.totalObjectives[o]] = 0;
		usedGoalStats.totalWeightsInObjective[constants.totalObjectives[o]] = 0;
	}
	for (var g in levels.gimmicks) {
		usedGoalStats.levelObjectives[g] = 0;
		usedGoalStats.levelObjectiveWeights[g] = 0;
	}

	for (var i = 0; i < ruleset.size * ruleset.size; i++) {
		reweighGoalDatas(usedGoalStats, levelGoalDatas, totalGoalDatas);

		var g;
		r = Math.random();
		if (levelGoalDatas.length > 0 && (r < chance[ruleset.save].level.chance + ruleset.length * chance[ruleset.save].level.length_bonus || totalGoalDatas.length == 0))
			g = new Goal(chooseLevelGoalData(levelGoalDatas, usedGoalStats));
		else if (totalGoalDatas.length > 0)
			g = new Goal(chooseTotalGoalData(totalGoalDatas, usedGoalStats));
		else
			break;

		placeGoal(goals, g, ruleset.size, bingos);
	}

	return goals;
}

function placeGoal(goals, g, size, bingos) {
	var balanceVals = [];

	function calcBalance(goals) {
		var total = 0;
		for (var b = 0; b < bingos.length; b++) {
			bTotal = 0;
			for (var cell = 0; cell < size; cell++) {
				if (goals[bingos[b][cell]])
					bTotal += goals[bingos[b][cell]].goalData.type == "level" ? 1 : -1;
			}
			// console.log(bingos[b], bTotal);
			total += bTotal * bTotal;
		}
		// console.log("total", total)
		return total;
	}

	// console.log("before")
	// for (var i = 0; i < size; i++) {
		// var row = ""
		// for (var j = 0; j < size; j++) {
			// if (goals[i * size + j])
				// row += goals[i * size + j].goalData.type == "level" ? "| " : "X ";
			// else
				// row += ". "
		// }
		// console.log(row);
	// }
	// console.log("place", g.goalData.type, g.goalData.type == "level" ? "|" : "X");
	// console.log(calcBalance(goals));

	for (var p = 0; p < size * size; p++) {
		if (goals[p] !== undefined) {
			balanceVals[p] = 1000;
		} else {
			goals[p] = g;
			balanceVals[p] = calcBalance(goals);
			goals[p] = undefined;
		}
	}

	var bestBalance = Math.min(...balanceVals);
	var bestCells = [];
	for (var i = 0; i < size * size; i++) {
		if (balanceVals[i] == bestBalance)
			bestCells.push(i);
	}
	var bestCell = bestCells[Math.floor(Math.random() * bestCells.length)];
	goals[bestCell] = g;

	// console.log(balanceVals);
	// console.log(bestBalance);
	// console.log(bestCells);
	// console.log(bestCell);
}

function updateUsedGoalStats(usedGoalStats, goalData) {
	usedGoalStats.characters[goalData.character]++;
	usedGoalStats.hubs[goalData.hub]++;

	if (goalData.leveltype)
		usedGoalStats.leveltypes[goalData.leveltype]++;
	else if (goalData.keytype)
		usedGoalStats.leveltypes[constants.levelTypes[constants.keys.indexOf(goalData.keytype)]]++;
	else if (goalData.type == "level")
		usedGoalStats.leveltypes[levels.levels[goalData.level].type]++;

	o = goalData.gtype || goalData.objective;

	if (goalData.type == "level") {
		usedGoalStats.levels++;
		usedGoalStats.levelObjectives[o]++;
	} else { // total
		usedGoalStats.totals++;
		usedGoalStats.totalObjectives[o]++;
	}
}

function reweighGoalDatas(usedGoalStats, levelGoalDatas, totalGoalDatas) {
	usedGoalStats.levelObjectiveWeightTotal = 0;
	for (var o in usedGoalStats.levelObjectives) {
		usedGoalStats.levelWeightsInObjective[o] = 0;
		usedGoalStats.levelObjectiveWeights[o] = 0;
		var filteredDatas = levelGoalDatas.filter(gd => gd.gtype ? gd.gtype == o : gd.objective == o);
		if (filteredDatas.length == 0)
			continue;
		usedGoalStats.levelObjectiveWeights[o] = 1 / Math.pow(4, usedGoalStats.levelObjectives[o]);
		usedGoalStats.levelObjectiveWeightTotal += usedGoalStats.levelObjectiveWeights[o];

		for (var gd in filteredDatas) {
			var w = 1 / (1 + 4 * usedGoalStats.hubs[filteredDatas[gd].hub] + 4 * usedGoalStats.characters[filteredDatas[gd].character] + 4 * usedGoalStats.leveltypes[levels.levels[filteredDatas[gd].level].type]);
			if (filteredDatas[gd].character)
				w *= 0.25;

			filteredDatas[gd].weight = w;
			usedGoalStats.levelWeightsInObjective[o] += w;
		}
	}

	usedGoalStats.totalObjectiveWeightTotal = 0;
	for (var o in usedGoalStats.totalObjectives) {
		usedGoalStats.totalWeightsInObjective[o] = 0;
		usedGoalStats.totalObjectiveWeights[o] = 0;
		var filteredDatas = totalGoalDatas.filter(gd => gd.count == o);
		if (filteredDatas.length == 0)
			continue;
		usedGoalStats.totalObjectiveWeights[o] = 1 / Math.pow(4, usedGoalStats.totalObjectives[o]);
		usedGoalStats.totalObjectiveWeightTotal += usedGoalStats.totalObjectiveWeights[o];

		for (var gd in filteredDatas) {
			var w = 1 / (1 + 4 * usedGoalStats.hubs[filteredDatas[gd].hub] + 4 * usedGoalStats.characters[filteredDatas[gd].character] + 4 * (filteredDatas[gd].leveltype ? usedGoalStats.leveltypes[filteredDatas[gd].leveltype] : 0));
			if (filteredDatas[gd].character)
				w *= 0.5;
			if (filteredDatas[gd].leveltype) { 
				w *= 0.5;
				if (filteredDatas[gd].hub)
					w *= 0.5;
			}

			filteredDatas[gd].weight = w;
			usedGoalStats.totalWeightsInObjective[o] += w;
		}
	}
}

function makeLevelGoalDatas(ruleset) {
	var validGoalDatas = [];
	var totalWeight = 0;

	for (var l in levels.levels) {
		if (!ruleset.tutorials && levels.levels[l].hub == "Tutorial")
			continue;
		if (!ruleset.difficults && levels.levels[l].hub == "Difficult")
			continue;

		constants.levelObjectives.forEach(function(o) {

			// if (o == "Beat" && !ruleset.beat)
				// return;
			// if (o == "SS" && !ruleset.ss)
				// return;
			if (o == "S finesse" && (!ruleset.sfinesse || !levels.levels[l].sfinesse))
				return;
			if (o == "S complete" && !ruleset.scomplete)
				return;
			if (o == "B complete" && !ruleset.bcomplete)
				return;
			if (o == "D complete" && (!ruleset.dcomplete || !levels.levels[l].dcomplete))
				return;
			if (o == "Genocide" && (!ruleset.genocide || !levels.levels[l].genocide))
				return;
			if (o == "Unload" && (!ruleset.unload || !levels.levels[l].unload))
				return;
			if (o == "OOB" && (!ruleset.unload || !levels.levels[l].oob))
				return;

			if (levels.levels[l].type == "Difficult" && ruleset.save == "New Game" && ruleset.length > 1)
				return; // no difficults in new game unless full game length
			if (l == "Yotta Difficult" && (o == "SS") && !ruleset.yottass)
				return;

			var d = utils.getLevelDifficulty(l, o, ruleset.save);
			// manual difficulty
			if (o == "Unload" || o == "OOB")
				d = 1;
			if (o == "D complete" && (l == "Containment" || l == "Alleyway"))
				d = 2;
			if (d < ruleset.difficulty || d > ruleset.maxEasy)
				return;

			if (!(o == "Beat" && !ruleset.beat || o == "SS" && !ruleset.ss)) {
				validGoalDatas.push({type: "level", level: l, objective: o, weight: 1});

				if (ruleset.characters && levels.levels[l].charselect && d - 1 >= ruleset.difficulty && o != "Unload" && o != "OOB") {
					constants.characters.forEach(function(c) {
						validGoalDatas.push({type: "level", level: l, objective: o, character: c, weight: 1});
					});
				}
			}

			if (ruleset.nosuper && (o == "Beat" || o == "SS") && levels.levels[l].nosuper[o] && d - 1 >= ruleset.difficulty) {
				validGoalDatas.push({type: "level", level: l, objective: o, nosuper: true, weight: 1});

				if (ruleset.characters && levels.levels[l].charselect) {
					constants.characters.forEach(function(c) {
						validGoalDatas.push({type: "level", level: l, objective: o, nosuper: true, character: c, weight: 1});
					});
				}
			}
		});

		levels.levels[l].gimmicks.forEach(function(g) {
			if (!ruleset[g.type])
				return;
			if (g.objective == "SS" && !ruleset.ss)
				return;
			if (g.difficulty < ruleset.difficulty || g.difficulty > ruleset.maxEasy)
				return;
			validGoalDatas.push({type: "level", level: l, objective: g.objective, gtype: g.type, gimmicks: [g], weight: 1});

			if (ruleset.characters && g.character && levels.levels[l].charselect && g.difficulty / 2 >= ruleset.difficulty) {
				constants.characters.forEach(function(c) {
					validGoalDatas.push({type: "level", level: l, objective: g.objective, character: c, gtype: g.type, gimmicks: [g], weight: 1});
				});
			}
		});
	}

	return validGoalDatas;
}

function makeTotalGoalDatas(ruleset) {
	var validGoalDatas = [];
	var usedTotalStrings = [];

	var chars = ruleset.characters ? constants.characters.slice() : [];
	chars.push(undefined);

	constants.totalObjectives.forEach(function(o) {
		if (o == "Beat" && !ruleset.beat)
			return;
		if (o == "SS" && !ruleset.ss)
			return;
		if (o == "keys" && !ruleset.keys)
			return;
		if (o == "apples" && !ruleset.apples)
			return;

		var min = chance[ruleset.save].total[o].minimum;
		var range = chance[ruleset.save].total[o].range;
		for (var i = min; i <= min + range; i++) {
			if (o == "Beat") {
				// character
				chars.forEach(function(c) {
					// hub
					var hubs = Object.keys(levels.hubs);
					if (!ruleset.tutorials || c == undefined)
						hubs.splice(hubs.indexOf("Tutorial"), 1);
					if (!ruleset.difficults || i > levels.hubs["Difficult"].levels || (ruleset.difficulty == 4 || !(ruleset.mode == "New Game" && ruleset.length == 1 && ruleset.difficulty <= 2)))
						hubs.splice(hubs.indexOf("Difficult"), 1);
					hubs.push(undefined);
					hubs.forEach(function(h) {
						// leveltypes
						var leveltypes = (h != "Tutorial" && h != "Difficult") ? constants.levelTypes.slice() : [];
						leveltypes.push(undefined);
						leveltypes.forEach(function(l) {

							var currentTotal = i;
							if (h !== undefined)
								currentTotal *= levels.hubs[h].levels / 64;
							if (l !== undefined)
								currentTotal *= 0.25;
							currentTotal = Math.ceil(currentTotal);

							// goalData
							var gd = {type: "total", count: o, total: currentTotal, hub: h, leveltype: l, character: c, weight: 1};
							var gds = makeGoalString(gd);
							if (usedTotalStrings.includes(gds))
								return;
							if (!utils.checkTotalDifficultyLength(gd, ruleset))
								return;

							validGoalDatas.push(gd);
							usedTotalStrings.push(gds);
						});
					});
				});
			} else if (o == "SS") {
				// character
				chars.forEach(function(c) {
					// hub
					var hubs = Object.keys(levels.hubs);
					if (!ruleset.tutorials || c == undefined)
						hubs.splice(hubs.indexOf("Tutorial"), 1);
					if (!ruleset.difficults || i > levels.hubs["Difficult"].levels - (ruleset.yottass ? 0 : 1) || (ruleset.difficulty == 4 || !(ruleset.mode == "New Game" && ruleset.length == 1 && ruleset.difficulty <= 2)))
						hubs.splice(hubs.indexOf("Difficult"), 1);
					hubs.push(undefined);
					hubs.forEach(function(h) {
						// leveltypes
						var leveltypes = (h != "Tutorial" && h != "Difficult") ? constants.levelTypes.slice() : [];
						leveltypes.push(undefined);
						leveltypes.forEach(function(l) {

							var currentTotal = i;
							if (h !== undefined)
								currentTotal *= levels.hubs[h].levels / 64;
							if (l !== undefined)
								currentTotal *= 0.25;
							currentTotal = Math.ceil(currentTotal);

							// goalData
							var gd = {type: "total", count: o, total: currentTotal, hub: h, leveltype: l, character: c, weight: 1};
							var gds = makeGoalString(gd);
							if (usedTotalStrings.includes(gds))
								return;
							if (!utils.checkTotalDifficultyLength(gd, ruleset))
								return;

							validGoalDatas.push(gd);
							usedTotalStrings.push(gds);
						});
					});
				});
			} else if (o == "keys") {
				// keyType
				constants.keys.forEach(function(k) {
					// hub
					var hubs = Object.keys(levels.hubs);
					hubs.splice(hubs.indexOf("Tutorial"), 1);
					hubs.splice(hubs.indexOf("Difficult"), 1);
					hubs.push(undefined);
					hubs.forEach(function(h) {

						var currentTotal = i;
						if (h !== undefined)
							currentTotal *= 0.25;
						currentTotal = Math.ceil(currentTotal);

						// goalData
						var gd = {type: "total", count: o, total: currentTotal, keytype: k, hub: h, weight: 1};
						var gds = makeGoalString(gd);
						if (usedTotalStrings.includes(gds))
							return;
						if (!utils.checkTotalDifficultyLength(gd, ruleset))
							return;

						validGoalDatas.push(gd);
						usedTotalStrings.push(gds);
					});
				});
			} else if (o == "apples") {
				// appleType
				["count", "Beat", "SS"].forEach(function(a) {
					if (a == "SS" && !ruleset.ss)
						return;
					// character
					chars.forEach(function(c) {
						// hub
						var hubs = Object.keys(levels.hubs);
						hubs.splice(hubs.indexOf("Tutorial"), 1);
						hubs.splice(hubs.indexOf("Difficult"), 1);
						hubs.push(undefined);
						hubs.forEach(function(h) {

							var currentTotal = i;
							if (h !== undefined)
								currentTotal *= 0.25;
							currentTotal = Math.ceil(currentTotal);

							// goalData
							var gd = {type: "total", count: o, total: currentTotal, appleType: a, character: c, hub: h, weight: 1};
							var gds = makeGoalString(gd);
							if (usedTotalStrings.includes(gds))
								return;
							if (!utils.checkTotalDifficultyLength(gd, ruleset))
								return;

							validGoalDatas.push(gd);
							usedTotalStrings.push(gds);
						});
					});
				});
			}
		}
	});

	return validGoalDatas;
}

function chooseLevelGoalData(levelGoalDatas, usedGoalStats) {
	var goalData;
	var r;
	var count;

	// make available list (some will exist)
	var availableTypes = Object.keys(usedGoalStats.levelObjectives).filter(o => usedGoalStats.levelWeightsInObjective[o] > 0);

	// choose random objective
	var o;
	r = Math.random() * usedGoalStats.levelObjectiveWeightTotal;
	count = 0;
	for (var ob in usedGoalStats.levelObjectiveWeights) {
		count += usedGoalStats.levelObjectiveWeights[ob];
		if (count > r) {
			o = ob;
			break;
		}
	}

	// choose goalData within objective
	var filteredDatas = levelGoalDatas.filter(gd => gd.gtype ? gd.gtype == o : gd.objective == o);
	r = Math.random() * usedGoalStats.levelWeightsInObjective[o];
	count = 0;
	for (var i = 0; i < filteredDatas.length; i++) {
		count += filteredDatas[i].weight;
		if (count > r) {
			goalData = filteredDatas[i];
			break;
		}
	}

	// remove all of same level
	var sameLevelDatas = levelGoalDatas.filter(gd => gd.level == goalData.level);
	for (var gd in sameLevelDatas) {
		levelGoalDatas.splice(levelGoalDatas.indexOf(sameLevelDatas[gd]), 1);
	}

	updateUsedGoalStats(usedGoalStats, goalData);
	return goalData;
}

function chooseTotalGoalData(totalGoalDatas, usedGoalStats) {
	var goalData;
	var r;
	var count;

	// make available list (some will exist)
	var availableTypes = Object.keys(usedGoalStats.totalObjectives).filter(o => usedGoalStats.totalWeightsInObjective[o] > 0);

	// choose random objective
	var o;
	r = Math.random() * usedGoalStats.totalObjectiveWeightTotal;
	count = 0;
	for (var ob in usedGoalStats.totalObjectiveWeights) {
		count += usedGoalStats.totalObjectiveWeights[ob];
		if (count > r) {
			o = ob;
			break;
		}
	}

	// choose goalData within objective
	var filteredDatas = totalGoalDatas.filter(gd => gd.count == o);
	r = Math.random() * 0.5 + (usedGoalStats.totalAlternate ? 0.5 : 0);
	r *= usedGoalStats.totalWeightsInObjective[o];
	usedGoalStats.totalAlternate = !usedGoalStats.totalAlternate;
	count = 0; 
	for (var i = 0; i < filteredDatas.length; i++) {
		count += filteredDatas[i].weight;
		if (count > r) {
			goalData = filteredDatas[i];
			break;
		}
	}

	// remove goalData
	totalGoalDatas.splice(totalGoalDatas.indexOf(goalData), 1);

	updateUsedGoalStats(usedGoalStats, goalData);
	return goalData;
}

function makeGoalString(goalData) {
	var str = "";

	if (goalData.type == "level") {
		str = goalData.objective + " " + goalData.level;

		if (goalData.character)
			str += " as " + goalData.character;
		if (goalData.nosuper)
			str += " without super";

		if (goalData.gimmicks) {
			goalData.gimmicks.forEach(function(g) {
				str += " with " + levels.gimmicks[g.type].format.replace("{count}", g.count).replace("{or fewer}", g.count > 0 ? "or fewer" : "") + (g.count != 1 ? levels.gimmicks[g.type].plural : "");
			});
		}

	} else if (goalData.type == "total") {
		switch (goalData.count) {
			case "Beat":
			case "SS": str = goalData.count + " " + goalData.total.toString() + (goalData.leveltype ? (" " + goalData.leveltype) : "") + " level" + (goalData.total > 1 ? "s" : ""); break;
			case "apples": {
				if (goalData.appleType == "Beat")
					str = "Hit apple and beat " + goalData.total.toString() + " level" + (goalData.total > 1 ? "s" : "");
				else if (goalData.appleType == "SS")
					str = "Hit apple and SS " + goalData.total.toString() + " level" + (goalData.total > 1 ? "s" : "");
				else // "count"
					str = "Hit " + goalData.total.toString() + " apple" + (goalData.total > 1 ? "s" : "");
				break;
			}
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
	self.revealed = false;

	self.toString = function() {
		return self.goalString;
	};

	self.getBoardData = function() {
		return {title: self.revealed ? self.goalString : "", achieved: self.achieved};
	};

	self.isAchieved = function() {
		return self.achieved.length > 0;
	};

	self.addAchiever = function(a) {
		self.achieved.push(a);
		self.reveal();
	};

	self.reveal = function() {
		self.revealed = true;
	}

	self.compareReplay = function(replay, player) {
		// check if replay meets goalData
		if (replay.validated < 1 && replay.validated != -3) {
			if (replay.validated == -7) {
				if (!self.goalData.minecraft)
					return false;
			} else if (replay.validated == -8) {
				if (!self.goalData.boss)
					return false;
			} else if (replay.validated == -9) {
				if (!(self.goalData.objective == "Unload" || self.goalData.objective == "OOB"))
					return false;
			} else if (replay.validated == -10) {
				if (!self.goalData.someplugin)
					return false;
			} else
				return false;
		}

		if (self.goalData.type == "level") {
			if (self.goalData.level == replay.levelname) {
				var score = utils.getReplayScore(replay);
				if (self.goalData.objective.length == 2 && score != self.goalData.objective)
					return false;

				if (self.goalData.objective == "S finesse" && score[1] != "S")
					return false;
				if (self.goalData.objective == "S complete" && score[0] != "S")
					return false;
				if (self.goalData.objective == "B complete" && score[0] != "B")
					return false;
				if (self.goalData.objective == "D complete" && score[0] != "D")
					return false;

				if (self.goalData.objective == "Genocide" && replay.tag !== undefined && replay.tag.genocide !== undefined && replay.tag.genocide != "1")
					return false;
				if (self.goalData.objective == "Unload" && replay.tag !== undefined && replay.tag.reason !== undefined && replay.tag.reason != "unload")
					return false;
				if (self.goalData.objective == "OOB" && replay.tag !== undefined && replay.tag.reason !== undefined && replay.tag.reason != "oob")
					return false;

				if (self.goalData.character && self.goalData.character != constants.characters[replay.character])
					return false;

				if (self.goalData.nosuper && replay.input_super > 0)
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