var bingoStarted = false;
var bingoLabels = [];
var isPlayer = false;
var playerHover = undefined;
var savedBoardData = {};
var playerFinished = {};
var playerTeam;

function updateBoardTable(boardData, target, notPopout) {
	bingoStarted = true;
	$("#temp_board_div").attr("style", "display: none");
	target.empty();

	savedBoardData = boardData;
	isPlayer = boardData.isPlayer;
	if (player in boardData.players)
		playerTeam = boardData.players[player].team;

	var table = $("<div></div>").addClass("bingo_table");
	table.attr('id', 'bingo_div');
	if (!notPopout)
		table.css('height', '100%');
	table.css({"min-width": 140 * bingoSize + "px"});

	var sizeWord = boardData.size == 5 ? "fifth" : (boardData.size == 4 ? "fourth" : "third");

	for (var i = 0; i < boardData.size; i++) {
		var row = $("<div class='row margin_zero" + (notPopout ? "" : " popout_row row-" + sizeWord) + "'></div>");
		for (var j = 0; j < boardData.size; j++) {
			var col = $("<div></div>").addClass("col-" + sizeWord);
			var cell = $("<div></div>").addClass("bingo_table_cell");
			var innerCell = $("<div id='goal_" + i + "_" + j + "'></div>").addClass("bingo_table_inner_cell");
			innerCell.append("<div class='goal_text'>" + boardData.goals[i * boardData.size + j].title + "</div>");
			
			var achievers = "";
			for (var a in boardData.goals[i * boardData.size + j].achieved) {
				var achiever = boardData.goals[i * boardData.size + j].achieved[a];
				if (playerHover == boardData.players[achiever].id) 
					innerCell.attr("style", "border-color:var(--" + boardData.players[playerHover].color + ");"
										  + "background-color:var(--cell" + boardData.players[playerHover].color + ");");
				else if (lockout || boardData.playerTeam == boardData.players[achiever].team || playerTeam == boardData.players[achiever].team) 
					innerCell.attr("style", "border-color:var(--" + boardData.players[achiever].color + ");"
										  + "background-color:var(--cell" + boardData.players[achiever].color + ");");
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

	if (notPopout) {
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
	// savedPlayerData = playerData;

	var table = $("<div class='players_table'></div>");

	// head
	var top = $("<div></div>").addClass("row").addClass("player_row").addClass("header_row");

	top.append($("<div class='col col_player'>Player</div>"));
	top.append($("<div class='col col_color'>Color</div>"));
	top.append($("<div class='col col_extra'>" + (bingoStarted ? "" : "Ready") + "</div>"));
	table.append(top);

	var alt = true;

	for (var i = 0; i < playerData.players.length; i++) {
		var row = $("<div id='tr_" + playerData.players[i].id + "'></div>").addClass("row").addClass("player_row");
		if (alt)
			row.addClass("player_row_alt");
		alt = !alt;

		if (playerData.players[i].finishTime > 0)
			row.addClass('player_finished');
		if (playerData.players[i].isWinner)
			row.addClass('player_winner');

		if (!playerFinished[playerData.players[i].id] && playerData.players[i].finishTime > 0) {
			playerFinished[playerData.players[i].id] = true;
			row.addClass("player_finish_animation");
		}

		var cell1 = $("<div class='col col_player'></div>");
		cell1.append(playerData.players[i].name);
		row.append(cell1);

		var cell2 = $("<div class='col col_color'></div>");
		var inner = $("<div class='color-circle' style='background-color:var(--" + playerData.players[i].color.toString() + ")'></div>")
		cell2.append(inner);
		row.append(cell2);

		var cell3 = $("<div class='col col_extra'></div>");
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
			var inner = $("<img class='ready-container' src='/bingo/img/ready_" + playerData.players[i].ready.toString() + ".png' />")
			cell3.append(inner);
		}
		row.append(cell3);
		row.mouseover(setPlayerHover);
		row.mouseout(endPlayerHover);
		table.append(row);
	}

	target.append(table);
}

function playerFinish(id) {
	$("#tr_" + id).addClass('player_finish_animation');
}

function setPlayerHover() {
	var id = $(this).attr("id").substring(3);
	if (bingoStarted && id != playerHover && id != player) {
		playerHover = id;
		updateBoardTable(savedBoardData, $('#board_div'), true);
	}
}

function endPlayerHover() {
	var id = $(this).attr("id").substring(3);
	if (bingoStarted && playerHover && playerHover == id) {
		playerHover = undefined;
		updateBoardTable(savedBoardData, $('#board_div'), true);
	}
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
		$("#color").enable();
	}
	isPlayer = false;
}

function popoutBoard() {
	var width = bingoSize * 140;
	var height = compact ? (70 * bingoSize) : (bingoSize * 128 + 2);

	var query = [];
	if (player)
		query.push("player=" + player);
	if (compact)
		query.push("compact=true");
	window.open(window.location.href + (window.location.href[window.location.href.length - 1] == '/' ? '' : '/') + 'popout' + (query.length > 0 ? "?" + query.join("&") : ""), '_blank', 'width=' + width + ',height=' + height);
}

function toggleCompact() {
	compact = $("#compact:checked").val();
	if ($("#board_div").hasClass("compact")) {
		$("#board_div").removeClass("compact");
		$("#temp_board_div").removeClass("compact");
	}
	if (compact) {
		$("#board_div").addClass("compact");
		$("#temp_board_div").addClass("compact");
	}
}

function setSizes(p) {
	$(".bingo_table").css({"min-width": 140 * bingoSize + "px"});
	$(".bingo_behind").css({"min-width": 140 * bingoSize + "px"});
	$(".popout_bingo_behind").css({"min-width": 140 * bingoSize + "px"});
	if (p) {
		$("body").css({"min-width": 140 * bingoSize + "px"});
	}
}