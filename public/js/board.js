var bingoStarted = false;
var bingoLabels = [];
var isPlayer = false;
var playerHover = undefined;
var savedBoardData = {};
var playerFinished = {};
var playerTeam;

function updateBoardTable(boardData, target, isPopout) {
	bingoStarted = true;
	$("#temp_board_div").attr("style", "display: none");
	target.empty();

	savedBoardData = boardData;
	isPlayer = boardData.isPlayer;
	if (player in boardData.players)
		playerTeam = boardData.players[player].team;

	var table = $("<div></div>").addClass("bingo_table");
	table.attr('id', 'bingo_div');
	if (isPopout)
		table.css('height', '100%');
	table.css({"min-width": 140 * ruleset.size + "px"});

	var sizeWord = boardData.size == 5 ? "fifth" : (boardData.size == 4 ? "fourth" : "third");

	if (!isPopout) {
		var bingo_top = $("<div class='row margin_zero bingo_top'/>");
		bingo_top.append("<div class='dia_identifier' value='0'/>")
		for (var i = 0; i < boardData.size; i++) {
			bingo_top.append("<div class='col-" + sizeWord + "'><div class='col_identifier' value='" + i + "'/></div>");
		}
		
		table.append(bingo_top);
	}
	
	for (var i = 0; i < boardData.size; i++) {
		var row = $("<div class='row margin_zero" + (isPopout ? " popout_row row-" + sizeWord : "") + "'></div>");
		row.append("<div class='row_identifier' value='" + i + "'/>")
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
				else if (ruleset.lockout || boardData.playerTeam == boardData.players[achiever].team || playerTeam == boardData.players[achiever].team) 
					innerCell.attr("style", "border-color:var(--" + boardData.players[achiever].color + ");"
										  + "background-color:var(--cell" + boardData.players[achiever].color + ");");
				achievers += "<div class='color-circle-small' " + 
					"style='background-color: var(--" + boardData.players[achiever].color 
					+ ");color:" + ($.inArray(boardData.players[achiever].color, ["white", "yellow"]) != -1 ? "var(--black)" : "var(--white)") 
					+ ";'>" + boardData.players[achiever].name[0] + "</div> ";
			}
			innerCell.append("<div class='goal_achievers_container'><div class='goal_achievers'>" + achievers + "</div></div>");
			(function(i,j) {innerCell.click(function() { toggleLabel(i, j) }); })(i,j);
			
			cell.append(innerCell);
			col.append(cell);
			row.append(col);
		}
		table.append(row);
	}

	table.append("<div class='row margin_zero bingo_bottom'><div class='dia_identifier' value='1'/></div>");
	target.append(table);

	for(var i = 0; i < bingoLabels.length; i++) {
		$(bingoLabels[i]).addClass('bingo_label');
	}
	
	if (!isPopout) {
		if (isPlayer && (!boardData.firstGoal || boardData.state == "Complete")) {
			var resetButton = $("<div style='display: inline-block'></div>").addClass("float-left");
			resetButton.append($("<a id='resettext' style='margin-right: 20px; color: var(--blue); cursor: pointer'>Vote for new board</a>"));
			resetButton.click(function() { $("#reset").click() });
			target.append(resetButton);
		}

		var popoutButton = $("<div style='display: inline-block'></div>").addClass("float-right");
		popoutButton.append($("<a id='popout' style='color: var(--blue); cursor: pointer'>Popout</a>"));
		popoutButton.click(popoutBoard);
		target.append(popoutButton);

		if (bingoStarted) {
			target.append($("<div class='time_info'>Start time: " + boardData.startDate + "</div>"));
			var replayText = boardData.lastReplay != "" ? "Last replay: " + boardData.lastReplay  : "";
			target.append($("<div id='replay' class='time_info'>" + replayText + "</div>"));
		}
	}
	
	// IDENTIFIER
	
	function identifierWrapper(lambda) {
		return function(e) {
			var target = $(e.target);
			var v = target.attr('value');
			if(v === undefined)
				return;
			
			lambda(v, target);
		}
	}
	
	var oldStyle = {};
	
	function colorSet(i, j) {
		var goal = $('#goal_' + i + "_" + j);
		var style = goal.attr('style')
		oldStyle['#goal_' + i + "_" + j] = style !== undefined && style !== "";
		if(!oldStyle['#goal_' + i + "_" + j]) 
			$('#goal_' + i + "_" + j).attr('style', 'background-color: var(--graydark)');
	}
	
	function colorUnset(i, j) {
		if(!oldStyle['#goal_' + i + "_" + j])
			$('#goal_' + i + "_" + j).attr('style', oldStyle['#goal_' + i + "_" + j] || "");
		oldStyle['#goal_' + i + "_" + j] = false;
	}
	
	function addLabel(i, j) {
		$('#goal_' + i + "_" + j).addClass('bingo_label');
		bingoLabels.push('#goal_' + i + "_" + j);

		if(!$('.col_identifier[value=' + j + ']').hasClass('bingo_label')) {
			add = true;
			for (var x = 0; x < ruleset.size; x++) {
				if (!$('#goal_' + x + "_" + j).hasClass('bingo_label')) {
					add = false;
					break;
				}
			}
			if (add) {
				$('.col_identifier[value=' + j + ']').addClass('bingo_label');
				bingoLabels.push(".col_identifier[value='" + i + "']");
			}
		}
		if(!$('.row_identifier[value=' + i + ']').hasClass('bingo_label')) {
			add = true;
			for (var x = 0; x < ruleset.size; x++) {
				if (!$('#goal_' + i + "_" + x).hasClass('bingo_label')) {
					add = false;
					break;
				}
			}
			if (add) {
				$('.row_identifier[value=' + i + ']').addClass('bingo_label');
				bingoLabels.push(".row_identifier[value='" + i + "']");
			}
		}
		if (i == j && !$('.dia_identifier[value=0]').hasClass('bingo_label')) {
			add = true;
			for (var x = 0; x < ruleset.size; x++) {
				if (!$('#goal_' + x + "_" + x).hasClass('bingo_label')) {
					add = false;
					break;
				}
			}
			if (add) {
				$('.dia_identifier[value=0]').addClass('bingo_label');
				bingoLabels.push(".dia_identifier[value='0']");
			}
		}
		if (i == ruleset.size - j - 1 && !$('.dia_identifier[value=1]').hasClass('bingo_label')) {
			add = true;
			for (var x = 0; x < ruleset.size; x++) {
				if (!$('#goal_' + x + "_" + (ruleset.size - x - 1)).hasClass('bingo_label')) {
					add = false;
					break;
				}
			}
			if (add) {
				$('.dia_identifier[value=1]').addClass('bingo_label');
				bingoLabels.push(".dia_identifier[value='1']");
			}
		}
	}
	
	function removeLabel(i, j) {
		$('#goal_' + i + "_" + j).removeClass('bingo_label');
		bingoLabels.splice(bingoLabels.indexOf('#goal_' + i + "_" + j), 1);

		if($('.col_identifier[value=' + j + ']').hasClass('bingo_label')) {
			$('.col_identifier[value=' + j + ']').removeClass('bingo_label');
			bingoLabels.splice(bingoLabels.indexOf(".col_identifier[value='"+j+"']"), 1);
		}
		if($('.row_identifier[value=' + i + ']').hasClass('bingo_label')) {
			$('.row_identifier[value=' + i + ']').removeClass('bingo_label');
			bingoLabels.splice(bingoLabels.indexOf(".row_identifier[value='"+i+"']"), 1);
		}
		if (i == j) {
			if($('.dia_identifier[value=0]').hasClass('bingo_label')) {
				$('.dia_identifier[value=0]').removeClass('bingo_label');
				bingoLabels.splice(bingoLabels.indexOf(".dia_identifier[value='0']"), 1);
			}
		}
		if (i == ruleset.size - j - 1) {
			if($('.dia_identifier[value=1]').hasClass('bingo_label')) {
				$('.dia_identifier[value=1]').removeClass('bingo_label');
				bingoLabels.splice(bingoLabels.indexOf(".dia_identifier[value='1']"), 1);
			}
		}
	}

	function toggleLabel(i, j) {
		if ($('#goal_' + i + "_" + j).hasClass("bingo_label"))
			removeLabel(i, j);
		else
			addLabel(i, j);
	}
	
	$('.col_identifier').hover(identifierWrapper(function(v) {		
		for(var i = 0; i < ruleset.size; i++) {
			colorSet(i, v);
		}
	}), identifierWrapper(function(v) {	
		for(var i = 0; i < ruleset.size; i++) {
			colorUnset(i, v);
		}
	})).click(identifierWrapper(function(v, target) {
		if(target.hasClass('bingo_label')) {
			target.removeClass('bingo_label')
			bingoLabels.splice(bingoLabels.indexOf(".col_identifier[value='"+v+"']"), 1);
			for(var i = 0; i < ruleset.size; i++) {
				if ($('#goal_' + i + "_" + v).hasClass('bingo_label'))
					removeLabel(i, v);
			}
		} else {
			target.addClass('bingo_label')
			bingoLabels.push(".col_identifier[value='"+v+"']");
			for(var i = 0; i < ruleset.size; i++) {
				if (!$('#goal_' + i + "_" + v).hasClass('bingo_label'))
					addLabel(i, v);
			}
		}
	}));
	
	$('.row_identifier').hover(identifierWrapper(function(v) {		
		for(var i = 0; i < ruleset.size; i++) {
			colorSet(v, i);
		}
	}), identifierWrapper(function(v) {	
		for(var i = 0; i < ruleset.size; i++) {
			colorUnset(v, i);
		}
	})).click(identifierWrapper(function(v, target) {
		if(target.hasClass('bingo_label')) {
			target.removeClass('bingo_label');
			bingoLabels.splice(bingoLabels.indexOf(".row_identifier[value='"+v+"']"), 1);
			for(var i = 0; i < ruleset.size; i++) {
				if ($('#goal_' + v + "_" + i).hasClass('bingo_label'))
					removeLabel(v, i);
			}
		} else {
			target.addClass('bingo_label');
			bingoLabels.push(".row_identifier[value='"+v+"']");
			for(var i = 0; i < ruleset.size; i++) {
				if (!$('#goal_' + v + "_" + i).hasClass('bingo_label'))
					addLabel(v, i);
			}
		}
	}));
	
	$('.dia_identifier').hover(identifierWrapper(function(v) {
		if(v == 0) {
			for(var i = 0; i < ruleset.size; i++) {
				colorSet(i, i);
			}
		} else {
			for(var i = 0; i < ruleset.size; i++) {
				colorSet(i, ruleset.size - 1 - i);
			}
		}
	}), identifierWrapper(function(v) {
		if(v == 0) {
			for(var i = 0; i < ruleset.size; i++) {
				colorUnset(i, i);
			}
		} else {
			for(var i = 0; i < ruleset.size; i++) {
				colorUnset(i, ruleset.size - 1 - i);
			}
		}
	})).click(identifierWrapper(function(v, target) {
		if(target.hasClass('bingo_label')) {
			target.removeClass('bingo_label')
			bingoLabels.splice(bingoLabels.indexOf(".dia_identifier[value='"+v+"']"), 1);
			if(v == 0) {
				for(var i = 0; i < ruleset.size; i++) {
					if ($('#goal_' + i + "_" + i).hasClass('bingo_label'))
						removeLabel(i, i);
				}
			} else {
				for(var i = 0; i < ruleset.size; i++) {
					if ($('#goal_' + i + "_" + (ruleset.size - 1 - i)).hasClass('bingo_label'))
						removeLabel(i, ruleset.size - 1 - i);
				}
			}
		} else {
			target.addClass('bingo_label')
			bingoLabels.push(".dia_identifier[value='"+v+"']");
			if(v == 0) {
				for(var i = 0; i < ruleset.size; i++) {
					if (!$('#goal_' + i + "_" + i).hasClass('bingo_label'))
						addLabel(i, i);
				}
			} else {
				for(var i = 0; i < ruleset.size; i++) {
					if (!$('#goal_' + i + "_" + (ruleset.size - 1 - i)).hasClass('bingo_label'))
						addLabel(i, ruleset.size - 1 - i);
				}
			}
		}
	}));

	
	
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
		updateBoardTable(savedBoardData, $('#board_div'), false);
	}
}

function endPlayerHover() {
	var id = $(this).attr("id").substring(3);
	if (bingoStarted && playerHover && playerHover == id) {
		playerHover = undefined;
		updateBoardTable(savedBoardData, $('#board_div'), false);
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
	var width = ruleset.size * 140;
	var height = compact ? (70 * ruleset.size) : (ruleset.size * 128 + 2);

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
	$(".bingo_table").css({"min-width": 140 * ruleset.size + "px"});
	$(".bingo_behind").css({"min-width": 140 * ruleset.size + "px"});
	$(".popout_bingo_behind").css({"min-width": 140 * ruleset.size + "px"});
	if (p) {
		$("body").css({"min-width": 140 * ruleset.size + "px"});
	}
}