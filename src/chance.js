var chance = {
	true: {
		level: {
			chance: 0.5,
			length_bonus: 0.1,
		},
		total: {
			chance: 1,
			type_bonus: 0.05,
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
	false: {
		level: {
			chance: 0.5,
			length_bonus: 0.1,
		},
		total: {
			chance: 1,
			type_bonus: 0.05,
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