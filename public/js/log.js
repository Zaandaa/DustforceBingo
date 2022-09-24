var bingoLog = {};

function emptyLog() {
	$('#log_div').empty();
}

function showBingoLog() {
	for (var l in bingoLog) {
		if (!bingoLog[l].str)
			continue;

		var row = $("<div/>").addClass("log_row").text(bingoLog[l].str);
		$('#log_div').prepend(row);
	}
}
