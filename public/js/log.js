
function showBingoLog(log, target) {
	for (var l in log) {
		if (!log[l].str)
			continue;

		var row = $("<div/>").addClass("log_row");

		if (log[l].type == "replay") {
			;
		} else if (log[l].type == "goal") {
			;
		} else if (log[l].type == "finish") {
			;
		} else if (log[l].type == "capture") {
			;
		}

		row.append("<p>" + log[l].str + "</p>");
		target.append(row);

	}
}


$(document).on('ready', function() {
	updateBoardTable(logBoardData, $('#board_div'), false);
	updatePlayersTable(logPlayerData, $('#players_table_div'));
	showBingoLog(bingoLog, $('#log_div'));
});