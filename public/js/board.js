
function updateBoardTable(boardJson) {
	$("#bingo_table_div").empty();

	boardData = JSON.parse(boardJson);

	var table = $("<table></table>").addClass("bingo_table");

	for (var i = 0; i < boardData.size * boardData.size; i++) {
		var row = $("<tr></tr>");
		for (var j = 0; j < boardData.size; j++) {
			var cell = $("<td></td>");
			cell.append(boardData.goals[i * boardData.size + j].title);
			row.append(cell);
		}
		table.append(row);
	}

	$("#bingo_table_div").append(table);
}
