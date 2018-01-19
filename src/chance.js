var chance = {
	"New Game": {
		level: {
			chance: 0.3,
			length_bonus: 0.1,
		},
		total: {
			chance: 1,
			Beat: {
				minimum: 4,
				range: 60,
			},
			SS: {
				minimum: 4,
				range: 60,
			},
			keys: {
				minimum: 1,
				range: 15,
			},
			apples: {
				minimum: 2,
				range: 28,
			},
		}
	},
	"New Game +": {
		level: {
			chance: 0.3,
			length_bonus: 0.1,
		},
		total: {
			chance: 1,
			Beat: {
				minimum: 4,
				range: 60,
			},
			SS: {
				minimum: 4,
				range: 60,
			},
			keys: {
				minimum: 1,
				range: 15,
			},
			apples: {
				minimum: 2,
				range: 28,
			},
		}
	}
};

module.exports = chance;