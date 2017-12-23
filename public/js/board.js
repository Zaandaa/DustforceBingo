function updateBoardTable(boardJson, target) {
	target.empty();

	boardData = JSON.parse(boardJson);

	var table = $("<table></table>").addClass("bingo_table");

	for (var i = 0; i < boardData.size; i++) {
		var row = $("<tr></tr>");
		for (var j = 0; j < boardData.size; j++) {
			var cell = $("<td></td>");
			cell.append(boardData.goals[i * boardData.size + j].title);
			for (var a in boardData.goals[i * boardData.size + j].achieved) {
				cell.append("<br><b>" + boardData.goals[i * boardData.size + j].achieved[a] + "</b>");
			}
			row.append(cell);
		}
		table.append(row);
	}

	target.append(table);
}
