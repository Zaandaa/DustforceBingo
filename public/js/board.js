var bingoStarted = false;
var bingoLabels = [];

function updateBoardTable(boardJson, target, includeBottom) {
	bingoStarted = true;
	target.empty();

	boardData = JSON.parse(boardJson);

	var table = $("<div></div>").addClass("bingo_table");
	table.attr('id', 'bingo_div');

	var col_width = (boardData.size == 5) ? "fifth" : "third";

	for (var i = 0; i < boardData.size; i++) {
		var row = $("<div class='row margin_zero'></div>");
		for (var j = 0; j < boardData.size; j++) {
			var col = $("<div></div>").addClass("col-" + col_width);
			var cell = $("<div></div>").addClass("bingo_table_cell");
			var innerCell = $("<div id='goal_" + i + "_" + j + "'></div>").addClass("bingo_table_inner_cell");
			innerCell.append("<div class='goal_text'>" + boardData.goals[i * boardData.size + j].title + "</div>");
			
			var achievers = "";
			for (var a in boardData.goals[i * boardData.size + j].achieved) {
				var achiever = boardData.goals[i * boardData.size + j].achieved[a];
				if (lockout) 
					innerCell.attr("style", "border-color:var(--" + boardData.players[achiever].color + ");");
				achievers += "<div class='color-circle-small' " + 
					"style='background-color: var(--" + boardData.players[achiever].color 
					+ ");color:" + ($.inArray(boardData.players[achiever].color, ["white", "yellow"]) != -1 ? "var(--black)" : "var(--white)") 
					+ ";'>" + boardData.players[achiever].name[0] + "</div> ";
			}
			innerCell.append("<div class='goal_achievers_container'><div class='goal_achievers'>" + achievers + "</div></div>");
			innerCell.click(toggleLabel);
			if (bingoLabels.includes("goal_" + i + "_" + j))
				innerCell.addClass("bingo_label");
			cell.append(innerCell);
			col.append(cell);
			row.append(col);
		}
		table.append(row);
	}

	target.append(table);

	if (includeBottom) {
		var popoutButton = $("<div></div>").addClass("float-right");
		popoutButton.append($("<a id='popout'>Popout Board</a>"));
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
	row.append($("<th style='width: 50%'>Player</th>"));
	row.append($("<th style='width: 20%'>Color</th>"));
	row.append($("<th>" + (bingoStarted ? "" : "Ready") + "</th>"));
	thead.append(row);
	table.append(thead);

	for (var i = 0; i < playerData.players.length; i++) {
		var row = $("<tr id='tr_" + playerData.players[i].id + "'></tr>");

		if (playerData.players[i].finishTime > 0)
			row.addClass('player_finished');
		if (playerData.players[i].isWinner)
			row.addClass('player_winner');

		var cell1 = $("<td></td>");
		cell1.append(playerData.players[i].name);
		row.append(cell1);

		var cell2 = $("<td></td>");
		var inner = $("<div class='color-circle' style='background-color:var(--" + playerData.players[i].color.toString() + ")'></div>")
		cell2.append(inner);
		row.append(cell2);

		var cell3 = $("<td></td>");
		if (bingoStarted) {
			if (playerData.players[i].finishTime > 0) {
				var time = new Date(playerData.players[i].finishTime);
				var h = time.getUTCHours();
				var m = time.getMinutes();
				var s = time.getSeconds();
				cell3.append((h > 0 ? h + ":" : "") + (h > 0 && m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s);
			}
		} else {
			var inner = $("<img class='ready-container' src='/img/ready_" + playerData.players[i].ready.toString() + ".png' />")
			cell3.append(inner);
		}
		row.append(cell3);

		table.append(row);
	}

	target.append(table);
}

function playerFinish(data) {
	$("#tr_" + data.player).addClass('player_finish_animation');
}

function toggleLabel() {
	if ($(this).hasClass("bingo_label")) {
		$(this).removeClass("bingo_label");
		bingoLabels.splice(bingoLabels.indexOf($(this).attr("id")), 1);
	} else {
		$(this).addClass("bingo_label");
		bingoLabels.push($(this).attr("id"));
	}
}

function removeStartButton() {
	if ($('#start').length && !$('#bingo_div').length) {
		$('#fake_center').empty();
		var element = $("<h2 style='text-align: center; margin: auto'>Starting...</h2>")
		$('#fake_center').append(element);
	}
}

function popoutBoard() {
	window.open(window.location.href + (window.location.href[window.location.href.length - 1] == '/' ? '' : '/') + 'popout', '_blank', 'width=700,height=' + (bingoSize * 128 + 2));
}