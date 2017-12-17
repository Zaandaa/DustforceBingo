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

var rules = {};
var goals = [];
var size = 3;


function generateSeed() {
	Math.seedrandom();
	var seed = "";
	for (var i = 0; i < maxSeedLength; i++) {
		seed += seedChars.charAt(Math.floor(Math.random() * seedChars.length));
	}
	$("#seed").val(seed);
}

function loadSeed() {
	;
}

function makeBoard() {
	seed = $("#seed").val();
	Math.seedrandom(seed);

	// rules

	// check size
	

	goals = new Array();
	for (var i = 0; i < size * size; i++) {
		goals.push(makeGoal());
	}

}


function getReplays() {
	// magic get replays
	var replays = [];

	for (var i = i; i < replays.length; i++) {
		if (checkReplay(replays[i])) {
			checkWinStatus();
		}
	}
}

function checkReplay(replay) {
	var success = false;
	for (var i = 0; i < goals.length; i++) {
		// if (lockout && goals[i].isAchieved()) {
			// continue;
		// }
		if (goals[i].compareReplay(replay)) {
			goals[i].achieve("replay player");
			success = true;
		}
	}
	return success;
}

function checkWinStatus() {
	;
}


function updateBoardTable() {
	$("#bingo_table_div").empty();

	var table = $("<table></table>").addClass("bingo_table");

	for (var i = 0; i < size; i++) {
		var row = $("<tr></tr>");
		for (var j = 0; j < size; j++) {
			var cell = $("<td></td>");
			cell.append(goals[i * size + j].toString());
			row.append(cell);
		}
		table.append(row);
	}

	$("#bingo_table_div").append(table);
}
