var socket = io(window.location.origin, {
	path: '/bingo/socket.io'
});

$(document).on('ready', function() {
	socket.emit('init', {session: sessionId});

	socket.on('board', function(data) {
		$('#temp_board_div').attr("style", "display: none");
		$('#board_div').attr("style", "");
		updateBoardTable(JSON.parse(data), $('#board_div'), true);
	});

	socket.on('reset', function(data) {
		$('#board_div').empty();
		$('#board_div').attr("style", "display: none");
		$('#temp_board_div').attr("style", "");
	});
});