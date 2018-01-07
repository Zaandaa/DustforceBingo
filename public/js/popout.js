var socket = io();

$(document).on('ready', function() {
	socket.emit('init', {session: sessionId});

	socket.on('board', function(data) {
		// console.log("got board", data);
		updateBoardTable(data, $('#board_div'), false);
	});
});