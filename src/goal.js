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
condition
achieved
who achieved

*/


function makeGoal() {
	var newCondition = makeGoalCondition();
	var newGoalString = makeGoalString(newCondition);
	while (checkGoalExists(newGoalString)) {
		newCondition = makeGoalCondition();
		newGoalString = makeGoalString(newCondition);
	}

	return new Goal(newCondition, newGoalString);
}

function checkGoalExists(goalString) {
	for (var i = 0; i < goals.length; i++) {
		if (goals[i].toString() == goalString) {
			return true;
		}
	}
	return false;
}

function makeGoalCondition() {

	var condition = [];
	var r;

	// type
	r = Math.random();
	if (r < chances[mode].level.chance) {
		condition.push("level");

		condition.push(levels[Math.floor(Math.random() * 64)]);

		r = Math.random();
		if (r < chances[mode].level.beat) {
			condition.push("Beat");
		} else if (r < chances[mode].level.ss) {
			condition.push("SS");
		}

		r = Math.random();
		if (r < chances[mode].level.character) {
			condition.push(characters[Math.floor(Math.random() * characters.length)]);
		}

		r = Math.random();
		if (r < chances[mode].level.apple) {
			condition.push("apple");
		}

	} else { // < chances[mode].total.chance
		condition.push("total");

		r = Math.random();
		if (r < chances[mode].total.beat.chance) {
			condition.push("Beat");
			condition.push(Math.floor(Math.random() * chances[mode].total.beat.range) + chances[mode].total.beat.minimum);
		} else if (r < chances[mode].total.ss.chance) {
			condition.push("SS");
			condition.push(Math.floor(Math.random() * chances[mode].total.ss.range) + chances[mode].total.ss.minimum);
		//} else if (r < chances[mode].total.keys.chance) {
			// condition.push("keys");
			// condition.push(Math.floor(Math.random() * chances[mode].total.keys.range) + chances[mode].total.keys.minimum);
		// } else if (r < chances[mode].total.apple.chance) {
			// condition.push("apple");
			// condition.push(Math.floor(Math.random() * chances[mode].total.apple.range) + chances[mode].total.apple.minimum);
		}

		r = Math.random();
		if (r < chances[mode].total.hub) {
			condition.push(hubs[Math.floor(Math.random() * hubs.length)]);
			condition[2] = Math.ceil(condition[2] / 4);
		}

		r = Math.random();
		if (r < chances[mode].total.character) {
			condition.push(characters[Math.floor(Math.random() * characters.length)]);
		}

		// r = Math.random();
		// if (r < chances[mode].total.leveltype) {
			// condition.push(hubs[Math.floor(Math.random() * leveltypes.length)]);
			// condition[2] = Math.ceil(condition[2] / 4);
		// }

	}

	return condition;

}

function makeGoalString(condition) {
	var str = "";

	if (condition[0] == "level") {
		str = condition[2] + " " + condition[1]; // SS or beat + level
		// extras
		for (var i = 3; i < condition.length; i++) {
			if (condition[i] == "apple") {
				str += " with apple(s)";
			} else if ($.inArray(condition[i], characters) > -1) {
				str += " as " + condition[i];
			}
		}
	} else if (condition[0] == "total") {
		switch (condition[1]) {
			case "Beat":
			case "SS": str = condition[1] + " " + condition[2].toString() + " level" + (condition[2] > 1 ? "s" : ""); break;
			case "apple": str = "Hit " + condition[2].toString() + " apple" + (condition[2] > 1 ? "s" : ""); break;
		}
		for (var i = 3; i < condition.length; i++) {
			if ($.inArray(condition[i], hubs) > -1) {
				str += " in " + condition[i];
			} else if ($.inArray(condition[i], characters) > -1) {
				str += " as " + condition[i];
			}
		}
	}

	return str;
}

var Goal = function(goalCondition, goalString) {
	this.goalCondition = goalCondition;
	this.goalString = goalString;
	this.achieved = [];

	this.toString = function() {
		return this.goalString;
	};

	this.getBoardData = function() {
		return {title: this.goalString, achieved: this.achieved.toString()};
	}

	this.isAchieved = function() {
		return this.achieved.length > 0;
	};

	this.addAchiever = function(a) {
		this.achieved.push(a);
	};

	this.compareReplay = function(replay) {
		// check if replay meets condition

		if (this.goalCondition[0] == "level") {
			if (this.goalCondition[1] == replay.meta.levelname) {
				if (this.goalCondition[2] == "Beat") {
					return true;
				} else if (this.goalCondition[2] == "SS" && score_completion and score_finesse) {
					return true;
				} // else if apple check
			}
		} else {
			// tally this level to player progress first
			// compare player progress to goal
		}

		return false;
	};

	return this;
};

module.exports = Goal;