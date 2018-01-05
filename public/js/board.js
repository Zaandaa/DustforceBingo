function updateBoardTable(boardJson, target) {
	target.empty();

	boardData = JSON.parse(boardJson);

	var table = $("<div></div>").addClass("bingo_table");//.addClass("table").addClass("table-dark").addClass("table-bordered");
	table.attr('id', 'bingo_div');

	var col_width = (boardData.size == 5) ? 2 : 3;

	for (var i = 0; i < boardData.size; i++) {
		var row = $("<div class='row'></div>");
		for (var j = 0; j < boardData.size; j++) {
			var cell = $("<div></div>").addClass("bingo_table_cell").addClass("col-md-" + col_width);
			cell.append("<div>" + boardData.goals[i * boardData.size + j].title + "</div>");
			var achievers = "";
			for (var a in boardData.goals[i * boardData.size + j].achieved) {
				achievers += "<b>" + boardData.goals[i * boardData.size + j].achieved[a] + "</b> ";
			}
			cell.append("<div>" + achievers + "</div>");
			cell.click(toggleLabel);
			row.append(cell);
		}
		table.append(row);
	}

	var winner = $("<h2>Winner: " + boardData.winner + "</h2>");

	target.append(table);
}

function updatePlayersTable(playersJson, target) {
	target.empty();

	playerData = JSON.parse(playersJson);

	var table = $("<table></table>").addClass("table").addClass("table-dark");
	table.attr('id', 'players_table');

	// head
	var thead = $("<thead></thead>");
	thead.append($("<tr><th>Player</th><th>Ready</th></tr>"));
	table.append(thead);

	for (var i = 0; i < playerData.players.length; i++) {
		var row = $("<tr></tr>");
		var cell1 = $("<td></td>");
		cell1.append(playerData.players[i].name);
		row.append(cell1);

		var cell2 = $("<td></td>");
		cell2.append(playerData.players[i].ready.toString());
		row.append(cell2);
		table.append(row);
	}

	target.append(table);
}

function toggleLabel() {
	if ($(this).hasClass("bingo_label"))
		$(this).removeClass("bingo_label");
	else
		$(this).addClass("bingo_label");
}

function removeStartButton() {
	if ($('#start').length && !$('#bingo_div').length) {
		$('#board_div').empty();
		var element = $("<h2>Starting...</h2>")
		$('#board_div').append(element);
	}
}
