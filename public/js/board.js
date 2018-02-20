var bingoStarted = false;
var bingoLabels = [];
var isPlayer = false;
var playerHover = undefined;
var savedBoardData = {};
var savedPlayerData = {};
var playerFinished = {};
var playerTeam;

function updateBoardTable(boardData, target, isPopout) {
	
	function createGoal(i, j) {
		return {
			name : `#goal_${i}_${j}`,
			col	 : j,
			row  : i
		}
	}
	
	var goals = {
		"col": (c, it) => createGoal(it,c),
		"row": (c, it) => createGoal(c,it),
		"dia": (c, it) => c == 0 ? 
			createGoal(it,it) : 
			createGoal(it,ruleset.size-it-1)
	}
	
	var identifiers = {
		"col": (v) => `.col_identifier[value='${v}']`,
		"row": (v) => `.row_identifier[value='${v}']`,
		"dia": (v) => `.dia_identifier[value='${v}']`
	}
	
	function getIdentifiers(i, j) {
		return [{
			name  : identifiers["col"](j), 
			type  : "col",
			val   : j,
			valid : true
		},
		{
			name  : identifiers["row"](i), 
			type  : "row",
			val   : i,
			valid : true
		},
		{
			name  : identifiers["dia"](0), 
			type  : "dia",
			val   : 0,
			valid : i == j
		},
		{
			name  : identifiers["dia"](1), 
			type  : "dia",
			val   : 1,
			valid : i == ruleset.size - j - 1
		}]
	}
	
	// CREATE BOARD
	
	var sizeWord;
	switch (boardData.size) {
		case 3: sizeWord = "third"; break;
		case 4: sizeWord = "fourth"; break;
		case 5: sizeWord = "fifth"; break;
		case 8: sizeWord = "eighth"; break;
	}

	var small = ruleset.size == 8;

	function createEmptyBoard() {
		var table = $("<div/>")
			.addClass("bingo_table")
			.attr('id', 'bingo_div')
			.css({"min-width": (small ? 87.5 : 140) * ruleset.size + "px"});
			
		if (isPopout) {
			table.css('height', '100%');
		}
		
		return table;
	}

	function createTopIdentifiers() {
		var bingo_top = $("<div/>")
			.addClass('row')
			.addClass('margin_zero')
			.addClass('bingo_top')
			.append( $("<div/>")
				.addClass('dia_identifier') 
				.attr('value', 0)
			);
			
		for (var i = 0; i < boardData.size; i++) {
			bingo_top.append( $("<div/>")
				.addClass(`col-${sizeWord}`)
				.append( $("<div/>")
					.addClass('col_identifier')
					.attr('value', i)
				)
			);
		}
		
		return bingo_top;
	}

	function createBottomIdentifiers() {
		return $("<div/>")
			.addClass('row')
			.addClass('margin_zero')
			.addClass('bingo_bottom')
			.append( $("<div/>")
				.addClass('dia_identifier')
				.attr('value', 1)
			);
	}
	
	function createBingoRow(i) {
		var row = $("<div/>")
			.addClass('row')
			.addClass('margin_zero');
			
		if(isPopout) {
			row.addClass('popout_row')
				.addClass(`row-${sizeWord}`)
		} else if (!small) {
			row.append( $("<div/>")
				.addClass('row_identifier')
				.attr('value', i)
			);
		}

		return row;
	}

	function createBingoCell(i, j) {
		var col = $("<div/>")
			.addClass(`col-${sizeWord}`)
			.append( $("<div/>")
				.addClass("bingo_table_cell")
				.append( $("<div/>")
					.attr('id', `goal_${i}_${j}`)
					.addClass('bingo_table_inner_cell')
					.append( $("<div/>")
						.addClass('goal_achievers_container')
						.append( $("<div/>")
							.addClass('goal_achievers')
						)
					)
				)
			);
		
		return col;
	}

	function addGoalText(col, text) {
		$(col).find('.bingo_table_inner_cell')
			.append( $("<div/>")
				.addClass('goal_text')
				.text(text)
			);
	}
	
	function addAntiStyle(col, assignee) {
		$(col).find('.bingo_table_inner_cell')
			.css({
				'border-color'     : `var(--${assignee.color})`,
			});
	}
	
	function addAchievedStyle(col, achiever) {
		// console.log(achiever);
		$(col).find('.bingo_table_inner_cell')
			.css({
				'border-color'     : `var(--${achiever.color})`,
				'background-color' : `var(--cell${achiever.color})`
			});
	}
	
	function createAchieverCircle(achiever) {
		// console.log(achiever);
		var textColor = $.inArray(achiever.color, ["white", "yellow"]) != -1 ? "black" : "white";
		
		var circle = $("<div/>")
			.addClass('color-circle-small')
			.css({
				'background-color' : `var(--${achiever.color})`,
				'color'            : `var(--${textColor})`
			})
			.text(achiever.name[0]);
			
		// console.log(circle.attr('style'));	
		
		return circle;
	}
	
	function createResetButton() {
		var resetButton = $("<div/>")
			.css({
				'display': 'inline-block'
			})
			.addClass("float-left")
			.append( $("<a/>")
				.attr('id','resettext')
				.css({
					'margin-right' : '20px',
					'color'        : 'var(--blue)',
					'cursor'	   : 'pointer'
				})
				.text("Vote for new board")
			)
			.click(function() { $("#reset").click() });
		
		return resetButton;
	}
	
	function createPopout() {
		var popoutButton = $("<div/>") 
			.css({
				'display': 'inline-block'
			})
			.addClass("float-right")
			.append( $("<a/>")
				.attr('id','popout')
				.css({
					'color'        : 'var(--blue)',
					'cursor'	   : 'pointer'
				})
				.text("Popout")
			)
			.click(popoutBoard);
			
		return popoutButton;
	}
	
	bingoStarted = true;
	$("#temp_board_div").hide();
	target.empty();

	savedBoardData = boardData;
	isPlayer = boardData.isPlayer;
	if (player in boardData.players)
		playerTeam = boardData.players[player].team;

	var table = createEmptyBoard(isPopout);

	if (!isPopout && !small) {
		table.append(createTopIdentifiers());
	}
	
	for (var i = 0; i < boardData.size; i++) {
		var row = createBingoRow(i);
		
		for (var j = 0; j < boardData.size; j++) {
			var col = createBingoCell(i, j);
			var goal = boardData.goals[i * boardData.size + j];

			((i_copy, j_copy) =>
				$(col).find('.bingo_table_inner_cell').click(() => toggleLabel(i_copy, j_copy))
			)(i, j);
			
			addGoalText(col, goal.title)

			var firstAchieverStyled = false;
			var hoverStyled = false;

			if (goal.captured) {
				for (var p in boardData.players) {
					if (boardData.players[p].team == goal.captured) {
						addAchievedStyle(col, boardData.players[p]);
						break;
					}
				}
				row.append(col);
				continue;
			}

			$.each(goal.achieved, function(no, achieverId) {
				var achieverPlayer = boardData.players[achieverId];

				if (playerHover == achieverPlayer.team) {
					addAchievedStyle(col, achieverPlayer);
					hoverStyled = true;
				} else if (!hoverStyled &&
						(  boardData.playerTeam == achieverPlayer.team 
						|| playerTeam == achieverPlayer.team))
					addAchievedStyle(col, achieverPlayer);
				else if (!firstAchieverStyled)
					addAchievedStyle(col, achieverPlayer);
				firstAchieverStyled = true;
				
				var achieverCircle = createAchieverCircle(achieverPlayer);
				$(col).find('.goal_achievers')
					.append(achieverCircle);
			});
			
			
			row.append(col);
		}
		table.append(row);
	}

	var playerAntiStyled = []
	
	$.each(boardData.players, function(id, player) {
		$.each(player.goalBingos, function(no, goal) {
			addAntiStyle(identifiers[goal.type][goal.val], player);
			for(var i = 0; i < boardData.size; i++) {
				var goalName = goals[goal.type](goal.val, i).name;
				if (!playerAntiStyled.contains(goalName))
					addAntiStyle(goalName, player);
				if (player.team == playerTeam)
					playerAntiStyled.push(goalName);
			}
		});
	});
	
	if (!isPopout && !small) {
		table.append(createBottomIdentifiers());
	}
	
	target.append(table);

	for(var i = 0; i < bingoLabels.length; i++) {
		$(bingoLabels[i]).addClass('bingo_label');
	}
	
	if (!isPopout) {
		if (isPlayer && (!boardData.firstGoal || boardData.state == "Complete")) {
			target.append(createResetButton());
		}

		target.append(createPopout());

		if (bingoStarted) {
			var startText = (new Date(boardData.startTime)).toLocaleTimeString();
			target.append($("<div class='time_info'>Start time: " + startText + "</div>"));
			//var replayText = boardData.lastReplay != 0 ? "Last replay: " + (new Date(boardData.lastReplay)).toLocaleTimeString() : "";
			//target.append($("<div id='replay' class='time_info'>" + replayText + "</div>"));
		}
	}
	
	// IDENTIFIER
	
	var hasStyle = {};
	
	function colorSet(target) {
		var goal = $(target);
		var style = goal.attr('style')
		hasStyle[target] = style !== undefined && style !== "";
		if(!hasStyle[target]) {
			goal.css({
				'background-color': 'var(--graydark)'
			});
		}
	}
	
	function colorUnset(target) {
		if(!hasStyle[target])
			$(target).removeAttr('style');
		hasStyle[target] = false;
	}
	
	function addLabel(i, j) {
		$(`#goal_${i}_${j}`).addClass('bingo_label');
		bingoLabels.push(`#goal_${i}_${j}`);
		
		function checkAddLabel(type, i) {			
			for (var x = 0; x < ruleset.size; x++) {
				if (!$(goals[type](i, x).name).hasClass('bingo_label')) {
					return;
				}
			}
			
			$(identifiers[type](i)).addClass('bingo_label');
			bingoLabels.push(identifiers[type](i));
		}
		
		$.each(getIdentifiers(i,j), function(no,id) {
			if(id.valid && !$(id.name).hasClass('bingo_label')) {
				checkAddLabel(id.type, id.val);
			}
		});
	}
	
	function removeLabel(i, j) {
		$(`#goal_${i}_${j}`).removeClass('bingo_label');
		bingoLabels.remove(`#goal_${i}_${j}`);

		$.each(getIdentifiers(i,j), function(no,id) {
			if(id.valid && $(id.name).hasClass('bingo_label')) {
				$(id.name).removeClass('bingo_label');
				bingoLabels.remove(id.name);
			}	
		});
	}
	
	function toggleLabel(i, j) {
		if ($(`#goal_${i}_${j}`).hasClass("bingo_label"))
			removeLabel(i, j);
		else
			addLabel(i, j);
	}
	
	function getValue(lambda) {
		return function(e) {
			var target = $(e.target);
			var v = target.attr('value');
			if(v === undefined)
				return;
			
			lambda(v, target);
		}
	}
	
	function createIdentifierUX(type) {
		$(`.${type}_identifier`).hover(
			getValue(function(v) {
				for(var i = 0; i < ruleset.size; i++) {
					colorSet(goals[type](v, i).name);
				}
			})
		, 
			getValue(function(v) {
				for(var i = 0; i < ruleset.size; i++) {
					colorUnset(goals[type](v, i).name);
				}
			})
		)
		.click(getValue(function(v, target) {
			if(target.hasClass('bingo_label')) {
				target.removeClass('bingo_label')
				bingoLabels.remove(identifiers[type](v));
				for(var i = 0; i < ruleset.size; i++) {
					var goal = goals[type](v, i);
					if($(goal.name).hasClass('bingo_label'))
						removeLabel(goal.row, goal.col);
				}
			} else {
				target.addClass('bingo_label')
				bingoLabels.push(identifiers[type](v));
				for(var i = 0; i < ruleset.size; i++) {
					var goal = goals[type](v, i);
					if(!$(goal.name).hasClass('bingo_label'))
						addLabel(goal.row, goal.col);
				}
			}
		}));
	}
	
	if (!small) {
		createIdentifierUX("col");
		createIdentifierUX("row");
		createIdentifierUX("dia");
	}
	
	// ANTI
}

function updatePlayersTable(playersJson, target) {
	target.empty();

	playerData = JSON.parse(playersJson);
	savedPlayerData = playerData;

	var table = $("<div class='players_table'></div>");

	// head
	var top = $("<div></div>").addClass("row").addClass("player_row").addClass("header_row");

	top.append($("<div class='col col_color'></div>"));
	top.append($("<div class='col col_player'>Player</div>"));
	top.append($("<div class='col col_extra'>" + (bingoStarted ? "Score" : "Ready") + "</div>"));
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

		var cell1 = $("<div class='col col_color'></div>");
		var inner = $("<div class='color-circle' style='margin: auto; display: inherit; background-color:var(--" + playerData.players[i].color.toString() + ")'></div>")
		cell1.append(inner);
		row.append(cell1);

		var cell2 = $("<div class='col col_player' style='top: 2px'></div>");
		cell2.append(playerData.players[i].name);
		row.append(cell2);

		var cell3 = $("<div class='col col_extra'></div>");
		if (bingoStarted) {
			cell3.css({"top": "2px"});
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
			} else {
				if (ruleset.gametype == "64") {
					if (ruleset.win_type == "region")
						cell3.append("Connected Area: " + playerData.players[i].biggestRegion);
					else
						cell3.append("Area: " + playerData.players[i].totalRegion);
				} else if (ruleset.antibingo) {
					if (!playerData.allAntisAssigned)
						cell3.append("Bingos to assign: " + (ruleset.bingo_count - playerData.players[i].assignedAntis.length));
					else
						cell3.append("Bingos: " + playerData.players[i].bingos + ", Goals: " + playerData.players[i].goals);
				} else {
					if (ruleset.bingo_count_type == "bingo")
						cell3.append("Bingos: " + playerData.players[i].bingos + ", Goals: " + playerData.players[i].goals);
					else
						cell3.append("Goals: " + playerData.players[i].goals);
				}
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
	if (bingoStarted && savedPlayerData && id != playerHover && id != player) {
		for (var p in savedPlayerData.players) {
			if (savedPlayerData.players[p].id == id) {
				playerHover = savedPlayerData.players[p].team;
				updateBoardTable(savedBoardData, $('#board_div'), false);
				break;
			}
		}
	}
}

function endPlayerHover() {
	var id = $(this).attr("id").substring(3);
	if (bingoStarted && playerHover && savedPlayerData && playerHover) {
		for (var p in savedPlayerData.players) {
			if (savedPlayerData.players[p].id == id && playerHover == savedPlayerData.players[p].team) {
				playerHover = undefined;
				updateBoardTable(savedBoardData, $('#board_div'), false);
				break;
			}
		}
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
	var small = ruleset.size == 8;

	var width = ruleset.size * (ruleset.size == 8 ? 87.5 : 140);
	var height = small ? 50 * ruleset.size : (compact ? (70 * ruleset.size) : (ruleset.size * 128 + 2));

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
	var small = ruleset.size == 8;
	var width = small ? 87.5 : 140;
	$(".bingo_table").css({"min-width": width * ruleset.size + "px"});
	$(".bingo_behind").css({"min-width": width * ruleset.size + "px"});
	$(".popout_bingo_behind").css({"min-width": width * ruleset.size + "px"});
	if (p)
		$("body").css({"min-width": width * ruleset.size + "px"});
	if (small) {
		$("#board_div").addClass("compact");
		$("#temp_board_div").addClass("compact");
		$("#board_div").addClass("small64");
		$("#temp_board_div").addClass("small64");
	}
}