var getJSON = require('get-json');

var levels = require('./levels');
var utils = require('./utils');
var constants = require('./constants');


var Team = function(id) {
	self.id = id;
	self.players = [];

	self.finishTime = 0;
	self.isWinner = false;
	self.place = 0;

	self.goalsAchieved = []; // list of ids of goals achieved
	self.allCompletes = []; // all completes {levelname, completion, finesse, character}
	self.allProgress = {}; // dictionary of levels beaten
	self.charProgress = {"Dustman": {}, "Dustgirl": {}, "Dustkid": {}, "Dustworth": {}}; // dictionary of levels beaten

	// used by bingo for lockout forced win checking
	self.bingos = 0;
	self.maxBingos = 0;
	self.maxGoals = 0;
	self.canWin = true;

	self.assignedAnti = [];
	self.goalBingos = [];

	self.toString = function() {
		return self.id;
	};


	return self;
};

module.exports = Team;
