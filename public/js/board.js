var bingoStarted = false;
var bingoLabels = [];
var isPlayer = false;

function updateBoardTable(boardJson, target, includeBottom) {
	bingoStarted = true;
	$("#temp_board_div").attr("style", "display: none");
	target.empty();

	boardData = JSON.parse(boardJson);
	isPlayer = boardData.isPlayer;

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
		if (isPlayer && (!boardData.firstGoal || boardData.state == "Complete")) {
			var resetButton = $("<div style='display: inline-block'></div>").addClass("float-left");
			resetButton.append($("<a id='resettext' style='color: var(--blue); cursor: pointer'>Vote for new board</a>"));
			resetButton.click(function() { $("#reset").click() });
			target.append(resetButton);
		}

		var popoutButton = $("<div style='display: inline-block'></div>").addClass("float-right");
		popoutButton.append($("<a id='popout' style='color: var(--blue); cursor: pointer'>Popout</a>"));
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
				var placeEnding = "th";
				switch (playerData.players[i].place) {
					case 1: placeEnding = "st"; break;
					case 2: placeEnding = "nd"; break;
					case 3: placeEnding = "rd"; break;
				}
				cell3.append(playerData.players[i].place + placeEnding + " - " + (h > 0 ? h + ":" : "") + (h > 0 && m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s);
			}
			if (playerData.players[i].reset) {
				cell3.append(" voted");
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
	$('#start').attr("style", "display: none");
	$('#starting').attr("style", "");
}

function showStartButton() {
	$('#start').attr("style", "");
	$('#starting').attr("style", "display: none");
}

function resetBingo() {
	bingoStarted = false;
	bingoLabels = [];
	$("#temp_board_div").attr("style", "");
	$("#board_div").empty();

	showStartButton();
	$("#join").enable();
	$("#ready").text("Ready");
	if (!isPlayer) {
		$("#username").enable();
		$("#join").text("Join");
	} else {
		$("#ready").enable();
	}
	isPlayer = false;
}

function popoutBoard() {
	window.open(window.location.href + (window.location.href[window.location.href.length - 1] == '/' ? '' : '/') + 'popout', '_blank', 'width=700,height=' + (bingoSize * 128 + 2));
}
