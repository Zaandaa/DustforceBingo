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
}

module.exports = extern;