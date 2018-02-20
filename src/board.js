var extern = {}
extern.cachePossibleBingos = function(size) {
	var sets = [];
	var cells;
	for (var i = 0; i < size; i++) {
		// column i
		cells = [];
		for (var c = 0; c < size; c++) {
			cells.push(c * size + i);
		}
		sets.push(cells);

		// row i
		cells = [];
		for (var c = 0; c < size; c++) {
			cells.push(i * size + c);
		}
		sets.push(cells);
	}

	// diagonal tl br
	cells = [];
	for (var i = 0; i < size; i++) {
		cells.push(size * i + i);
	}
	sets.push(cells);

	// diagonal tr-bl
	cells = [];
	for (var i = 0; i < size; i++) {
		cells.push(size * (i + 1) - i - 1);
	}
	sets.push(cells);

	return sets;
};

extern.convertFrontId = function(size, frontId) {
	if (frontId.type == "row")
		return 2 * frontId.value;
	if (frontId.type == "col")
		return 2 * frontId.value + 1;
	if (frontId.type == "dia")
		return 2 * size + frontId.value;
	return -1;
};

extern.convertGoalBingo = function(size, backId) {
	b = {};
	b.type = (backId < size * 2) ? (b % 2 == 0 ? "row" : "col") : "dia";
	b.value = (backId < size * 2) ? Math.floor(backId / 2) : (backId - size * 2);
	return b;
};

module.exports = extern;