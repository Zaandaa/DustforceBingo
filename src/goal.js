/*
card types

type: single (level), total (keys, levels beaten, levels SSed, apples)
single: level, "SS" or "Beat", from hub (else any), as char, "apple"
total: x, "Beat" or "SS" or "key" or "apple", from hub (else any), as char (else any), level types


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


function makeGoal() {
	var newGoalData = makeGoalData();
	var newGoalString = makeGoalString(newGoalData);
	while (checkGoalExists(newGoalString)) {
		newGoalData = makeGoalData();
		newGoalString = makeGoalString(newGoalData);
	}

	return new Goal(newGoalData, newGoalString);
}

function checkGoalExists(goalString) {
	for (var i = 0; i < goals.length; i++) {
		if (goals[i].toString() == goalString) {
			return true;
		}
	}
	return false;
}

function makeGoalData() {

	var goalData = {};
	var r;

	// type
	r = Math.random();
	if (r < chances[mode].level.chance) {
		goalData.type = "level";

		goalData.level = Object.keys(levels.levels)[Math.floor(Math.random() * 64)];

		r = Math.random();
		if (r < chances[mode].level.beat) {
			goalData.objective = "Beat";
		} else if (r < chances[mode].level.ss) {
			goalData.objective = "SS";
		}

		r = Math.random();
		if (r < chances[mode].level.character) {
			goalData.character = characters[Math.floor(Math.random() * characters.length)];
		}

		if (!goalData.character) {
			r = Math.random();
			if (r < chances[mode].level.gimmick) {
				goalData.gimmicks["apple"];
			}
		}

	} else { // < chances[mode].total.chance
		goalData.push("total");

		r = Math.random();
		if (r < chances[mode].total.beat.chance) {
			goalData.push("Beat");
			goalData.push(Math.floor(Math.random() * chances[mode].total.beat.range) + chances[mode].total.beat.minimum);
		} else if (r < chances[mode].total.ss.chance) {
			goalData.push("SS");
			goalData.push(Math.floor(Math.random() * chances[mode].total.ss.range) + chances[mode].total.ss.minimum);
		//} else if (r < chances[mode].total.keys.chance) {
			// goalData.push("keys");
			// goalData.push(Math.floor(Math.random() * chances[mode].total.keys.range) + chances[mode].total.keys.minimum);
		// } else if (r < chances[mode].total.apple.chance) {
			// goalData.push("apple");
			// goalData.push(Math.floor(Math.random() * chances[mode].total.apple.range) + chances[mode].total.apple.minimum);
		}

		r = Math.random();
		if (r < chances[mode].total.hub) {
			goalData.push(hubs[Math.floor(Math.random() * hubs.length)]);
			goalData[2] = Math.ceil(goalData[2] / 4);
		}

		r = Math.random();
		if (r < chances[mode].total.character) {
			goalData.push(characters[Math.floor(Math.random() * characters.length)]);
		}

		// r = Math.random();
		// if (r < chances[mode].total.leveltype) {
			// goalData.push(hubs[Math.floor(Math.random() * leveltypes.length)]);
			// goalData[2] = Math.ceil(goalData[2] / 4);
		// }

	}

	return goalData;

}

function makeGoalString(goalData) {
	var str = "";

	if (goalData[0] == "level") {
		str = goalData[2] + " " + goalData[1]; // SS or beat + level
		// extras
		for (var i = 3; i < goalData.length; i++) {
			if (goalData[i] == "apple") {
				str += " with apple(s)";
			} else if ($.inArray(goalData[i], characters) > -1) {
				str += " as " + goalData[i];
			}
		}
	} else if (goalData[0] == "total") {
		switch (goalData[1]) {
			case "Beat":
			case "SS": str = goalData[1] + " " + goalData[2].toString() + " level" + (goalData[2] > 1 ? "s" : ""); break;
			case "apple": str = "Hit " + goalData[2].toString() + " apple" + (goalData[2] > 1 ? "s" : ""); break;
		}
		for (var i = 3; i < goalData.length; i++) {
			if ($.inArray(goalData[i], hubs) > -1) {
				str += " in " + goalData[i];
			} else if ($.inArray(goalData[i], characters) > -1) {
				str += " as " + goalData[i];
			}
		}
	}

	return str;
}

var Goal = function(goalData, goalString) {
	this.goalData = goalData;
	this.goalString = goalString;
	this.achieved = [];

	this.toString = function() {
		return this.goalString;
	};

	this.getBoardData = function() {
		return {title: this.goalString, achieved: this.achieved.toString()};
	};

	this.isAchieved = function() {
		return this.achieved.length > 0;
	};

	this.addAchiever = function(a) {
		this.achieved.push(a);
	};

	this.compareReplay = function(replay, player) {
		// check if replay meets goalData

		if (this.goalData.type == "level") {
			if (this.goalData.level == replay.meta.levelname) {
				if (this.goalData.objective == "SS" && (replay.meta.score_completion != 5 || replay.meta.score_finesse != 5))
					return false;
				if (this.goalData.character && this.goalData.character != characters[replay.meta.character])
					return false;

				for (var g in this.goalData.gimmicks) {
					if (!meetGoalGimmick(replay, g, this.goalData.gimmicks[g]))
						return false;
				}

				return true;
			}
		} else {
			// total, check against player.countObjective(kwargs)

			// >= beat, ss, apples, keys
			if (player.countObjective(goalData) >= this.goalData.total) {
				return true;
			}

			// <= low gimmicks (unused)

		}

		return false;
	};

	return this;
};

module.exports = Goal;