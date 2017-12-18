/*

options:

bingo rules
size dropdown: 3x3, 5x5
checkbox on lockout
win condition checks?:
first to x
majority (default)
checkbox bingo (dropdown 1 to 5)

save file: newgame, newgameplus
checkbox on allow requiring characters
checkbox off include difficults (long if new game)
checkbox off include tutorials (maybe always exclude)
checkbox on include apples

time preference? short vs long


*/


// move somewhere
// var replays = require("src/replays.js");
// replays(checkReplay);


var Bingo = function(seed, ruleset) {
	this.seed = seed;
	this.ruleset = ruleset;
	this.size = 3; // ruleset.size
	this.levelsValid = levels.slice(0,64); // use ruleset

	this.active = false;
	this.winner = "";

	this.goals = [];
	this.players = {};

	this.add_player = function(id, name) {
		this.players[id] = new Player(id, name);
	};

	this.remove_player = function(id) {
		delete this.players[id];
		this.checkPlayersReady();
	};

	this.checkPlayersReady = function() {
		var count = 0;
		for (var p in players) {
			if (players[p].getReady())
				count++;
		}
		// session.can_start(count > 1)
	}

	this.ready = function(id) {
		this.players[id].setReady(true);
		this.checkPlayersReady();
	};

	this.unready = function(id) {
		this.players[id].setReady(false);
		this.checkPlayersReady();
	};

	this.checkWinStatus = function(id) {
		var isWinner = false;

		// check players[id].goalsAchieved to match a win condition

		if (isWinner) {
			this.winner = this.players[id].toString();
			this.finish();
		}
	};

	this.start = function() {
		// create goals
		this.makeBoard();

		// remove not ready players
		

		// does this call session.start_timer()?
	};

	this.send_replay = function(replay) {
		if (!this.active)
			return false;

		// validate
		if (!replay.meta.validated) {
			return true; // doesn't handle early exit
		}

		// in players
		if (!(replay.meta.user in this.players)) {
			return true;
		}

		// in levels
		if ($.inArray(replay.meta.levelname, this.levelsValid) == -1) {
			return false;
		}

		var success = false;
		for (var i = 0; i < goals.length; i++) {
			// if (lockout && goals[i].isAchieved()) {
				// continue;
			// }
			if (goals[i].compareReplay(replay)) {
				this.goals[i].achieve(replay.meta.username);
				this.players[replay.meta.user].achieveGoal(i);
				success = true;
			}
		}

		if (success) {
			this.checkWinStatus(replay.meta.user);
			// session.updateBoard(this.getBoardData());
		}
		return true;
	};

	this.getBoardData = function() {
		var boardData = {};

		boardData.size = this.size;
		boardData.winner = this.winner;

		boardData.players = {};
		for (var id in this.players) {
			boardData.players[id] = this.players[id].getBoardData();
		}

		boardData.goals = {};
		for (var i = 0; i < this.goals.length; i++) {
			boardData.goals[i] = this.goals[i].getBoardData();
		}

		return JSON.stringify(boardData);
	}

	this.reveal = function() {
		this.active = true;
	};

	this.finish = function() {
		this.active = false;
		// session.finish();
	};


	return this;
}

module.exports = Bingo;
