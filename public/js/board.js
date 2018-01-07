var bingoStarted = false;

function updateBoardTable(boardJson, target, includePopoutLink) {
	bingoStarted = true;
	target.empty();

	boardData = JSON.parse(boardJson);

	var table = $("<div></div>").addClass("bingo_table");
	table.attr('id', 'bingo_div');

	var col_width = (boardData.size == 5) ? "fifth" : "4";

	for (var i = 0; i < boardData.size; i++) {
		var row = $("<div class='row'></div>");
		for (var j = 0; j < boardData.size; j++) {
			var cell = $("<div></div>").addClass("bingo_table_cell").addClass("col-" + col_width);
			var innerCell = $("<div></div>").addClass("bingo_table_inner_cell");
			innerCell.append("<div>" + boardData.goals[i * boardData.size + j].title + "</div>");
			var achievers = "";
			for (var a in boardData.goals[i * boardData.size + j].achieved) {
				var achiever = boardData.goals[i * boardData.size + j].achieved[a];
				achievers += "<b style='color: " + boardData.players[achiever].color + "'>" + boardData.players[achiever].name[0] + "</b> ";
			}
			innerCell.append("<div>" + achievers + "</div>");
			innerCell.click(toggleLabel);
			cell.append(innerCell);
			row.append(cell);
		}
		table.append(row);
	}

	target.append(table);

	var winner = $("<h2>Winner: " + boardData.winner + "</h2>");
	if (boardData.winner != "") {
		target.append(winner);
	}

	if (includePopoutLink) {
		var popoutButton = $("<button>Popout Board</button>").addClass("btn").addClass("btn-sm").addClass("btn-primary");
		popoutButton.click(popoutBoard);
		target.append(popoutButton);
	}
}

function updatePlayersTable(playersJson, target) {
	target.empty();

	playerData = JSON.parse(playersJson);

	var table = $("<table></table>").addClass("table").addClass("table-dark");
	table.attr('id', 'players_table');

	// head
	var thead = $("<thead></thead>");
	var row = $("<tr></tr>");
	row.append($("<th>Player</th>"));
	row.append($("<th>Color</th>"));
	if (bingoStarted)
		row.append($("<th>Goals</th>"));
	else
		row.append($("<th>Ready</th>"));
	thead.append(row);
	table.append(thead);

	for (var i = 0; i < playerData.players.length; i++) {
		var row = $("<tr></tr>");

		var cell1 = $("<td></td>");
		cell1.append(playerData.players[i].name);
		row.append(cell1);

		var cell2 = $("<td></td>");
		var inner = $("<div class='color-circle' style='background-color:var(--" + playerData.players[i].color.toString() + ")'></div>")
		cell2.append(inner);
		row.append(cell2);

		var cell3 = $("<td></td>");
		if (bingoStarted) {
			cell3.append(playerData.players[i].goals.toString());
		} else {
			var inner = $("<img class='ready-container' src='/img/ready_" + playerData.players[i].ready.toString() + ".png' />")
			cell3.append(inner);
		}
		row.append(cell3);

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

function popoutBoard() {
	window.open(window.location.href + '/popout', '_blank', 'width=600,height=400');
}
