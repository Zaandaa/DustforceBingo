
var characters = ["Dustman", "Dustgirl", "Dustkid", "Dustworth"];
var hubs = ["Forest", "Mansion", "City", "Laboratory"];
var keys = ["Wood", "Silver", "Gold", "Ruby"];
var levelTypes = ["Open", "Wood", "Silver", "Gold"];


var levels = require("levels.json");


function getHub(level) {
	return levels.levels[level].hub;
}

function getKey(level) {
	return levels.levels[level].key;
}

function getLevelType(level) {
	return levels.levels[level].type;
}
