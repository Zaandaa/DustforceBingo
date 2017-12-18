var Player = function(id, name) {
	this.id = id;
	this.name = name;
	this.color = "FFFFFF";
	this.ready = false;

	this.levelProgress = {
		// dictionary of levels
		// needs key points, apples, other info
	}

	this.goalsAchieved = []; // list of ids of goals achieved

	this.toString = function() {
		return this.name;
	};

	this.getBoardData = function() {
		return {name: this.name, color: this.color, goals: this.goalsAchieved.length};
	};

	this.getReady = function() {
		return this.ready;
	};

	this.setReady = function(r) {
		this.ready = r;
	};

	this.achieveGoal = function(id) {
		return this.goalsAchieved.push(id);
	};

	this.addProgress = function(replay) {
		// this.levelProgress[replay.meta.levelname] = score;
		// this.levelProgress[$.inArray(replay.meta.levelname, levels)] = score;
	};


	this.countKeys = function(type, hub) {
		if (!hub)
			hub = "All";

		var count = 0;

		// semi hardcoded loop through progress

		return count;
	}
}

	return this;
};

module.exports = Player;
