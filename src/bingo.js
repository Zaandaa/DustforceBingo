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


var Bingo = function(session, ruleset) {
	this.session = session;
	this.ruleset = JSON.parse(ruleset);

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
		this.session.canStart(count > 1)
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
		for (var i = 0; i < this.ruleset.size ** 2; i++) {
			this.goals.push(makeGoal());
		}

		// remove not ready players
		var playersToRemove = [];
		for (var p in this.players) {
			if (!this.players[p].getReady()) {
				playersToRemove.push(p);
			}
		}
		for (var i = 0; i < playersToRemove.length; i++) {
			delete this.players[playersToRemove[i]];
		}

		// does this call this.session.startTimer()?
	};

	this.checkReplay = function(replay) {
		if (!this.active)
			return false;

		// validate
		if (!replay.meta.validated)
			return false; // doesn't handle early exit

		// in players
		if (!(replay.meta.user in this.players))
			return false;

		// in levels
		if ($.inArray(replay.meta.levelname, this.levelsValid) == -1)
			return false;

		var success = false;
		for (var i = 0; i < goals.length; i++) {
			if (this.ruleset.lockout && goals[i].isAchieved()) {
				continue;
			} else if (goals[i].compareReplay(replay)) {
				this.goals[i].achieve(replay.meta.username);
				this.players[replay.meta.user].achieveGoal(i);
				success = true;
			}
		}

		if (success) {
			this.checkWinStatus(replay.meta.user);
			this.session.updateBoard(this.getBoardData());
		}
		return true;
	};

	this.getBoardData = function() {
		var boardData = {};

		boardData.size = this.ruleset.size;
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
		this.session.finish();
	};


	return this;
};

module.exports = Bingo;