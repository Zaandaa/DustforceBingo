function updateBoardTable(boardJson, target) {
	target.empty();

	boardData = JSON.parse(boardJson);

	var table = $("<table></table>").addClass("bingo_table").addClass("table").addClass("table-dark").addClass("table-bordered");

	for (var i = 0; i < boardData.size; i++) {
		var row = $("<tr></tr>");
		for (var j = 0; j < boardData.size; j++) {
			var cell = $("<td></td>");
			cell.append(boardData.goals[i * boardData.size + j].title);
			for (var a in boardData.goals[i * boardData.size + j].achieved) {
				cell.append("<br><b>" + boardData.goals[i * boardData.size + j].achieved[a] + "</b>");
			}
			cell.click(toggleLabel);
			row.append(cell);
		}
		table.append(row);
	}

	target.append(table);
}

function updatePlayersTable(playersJson, target) {
	target.empty();

	playerData = JSON.parse(playersJson);

	var table = $("<table></table>").addClass("table").addClass("table-dark");

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
