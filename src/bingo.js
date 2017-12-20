var goal = require('./goal');

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
	var self = this;
	self.session = session;
	self.ruleset = ruleset;

	self.active = false;
	self.winner = "";

	self.players = {};
	self.goals = goal.makeGoals(ruleset);


	self.add_player = function(id, name) {
		self.players[id] = new Player(id, name);
	};

	self.remove_player = function(id) {
		delete self.players[id];
		self.checkPlayersReady();
	};

	self.checkPlayersReady = function() {
		var count = 0;
		for (var p in players) {
			if (players[p].getReady())
				count++;
		}
		self.session.canStart(count > 1)
	};

	self.ready = function(id) {
		self.players[id].setReady(true);
		self.checkPlayersReady();
	};

	self.unready = function(id) {
		self.players[id].setReady(false);
		self.checkPlayersReady();
	};

	self.checkWinStatus = function(id) {
		var isWinner = false;

		// check players[id].goalsAchieved to match a win condition

		if (isWinner) {
			self.winner = self.players[id].toString();
			self.finish();
		}
	};

	self.start = function() {
		self.active = true;

		// remove not ready players
		var playersToRemove = [];
		for (var p in self.players) {
			if (!self.players[p].getReady()) {
				playersToRemove.push(p);
			}
		}
		for (var i = 0; i < playersToRemove.length; i++) {
			delete self.players[playersToRemove[i]];
		}
	};

	self.checkReplay = function(replay) {
		if (!self.active)
			return false;

		// validate
		if (replay.meta.validated < 1)
			return false; // doesn't handle early exit

		// in players
		if (!(replay.meta.user in self.players))
			return false;

		// in levels
		if (!levels.levels[replay.meta.levelname])
			return false;
		if (levels.levels[replay.meta.levelname].hub == "Tutorial" && !self.ruleset.includeTutorials)
			return false;
		if (levels.levels[replay.meta.levelname].hub == "Difficult" && !self.ruleset.includeDifficults)
			return false;

		self.players[replay.meta.user].addProgress(replay);

		var success = false;
		for (var i = 0; i < goals.length; i++) {
			if (self.ruleset.lockout && goals[i].isAchieved()) {
				continue;
			} else if (goals[i].compareReplay(replay, self.players[replay.meta.user])) {
				self.goals[i].achieve(replay.meta.username);
				self.players[replay.meta.user].achieveGoal(i);
				success = true;
			}
		}

		if (success) {
			self.checkWinStatus(replay.meta.user);
			self.session.updateBoard(self.getBoardData());
		}
		return true;
	};

	self.getBoardData = function() {
		var boardData = {};

		boardData.size = self.ruleset.size;
		boardData.winner = self.winner;

		boardData.players = {};
		for (var id in self.players) {
			boardData.players[id] = self.players[id].getBoardData();
		}

		boardData.goals = {};
		for (var i = 0; i < self.goals.length; i++) {
			boardData.goals[i] = self.goals[i].getBoardData();
		}

		return JSON.stringify(boardData);
	};

	self.finish = function() {
		self.active = false;
		self.session.finish();
	};


	return self;
};

module.exports = Bingo;