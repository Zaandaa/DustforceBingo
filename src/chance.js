/*
newgameplus
newgame


level
total

level values
beat vs SS
as char%
with apple%

total values
options
	keys
	level types
	apples
	beat x levels
	SS x levels
reasonable x values may vary per type

with character
hub specific (none or hub)

*/

var chance = {
	"New Game": {
		level: {
			chance: 0.3,
			length_bonus: 0.1,
		},
		total: {
			chance: 1,
			beat: {
				chance: 0.3,
				minimum: 4,
				range: 60,
			},
			ss: {
				chance: 0.6,
				minimum: 4,
				range: 60,
			},
			keys: {
				chance: 0.8,
				minimum: 1,
				range: 15,
			},
			apples: {
				chance: 1,
				minimum: 2,
				range: 23,
			},
			hub: 0.75,
			character: 0.7,
			leveltype: 0.5,
		}
	},
	"New Game +": {
		level: {
			chance: 0.3,
			length_bonus: 0.1,
		},
		total: {
			chance: 1,
			beat: {
				chance: 0.3,
				minimum: 4,
				range: 60,
			},
			ss: {
				chance: 0.6,
				minimum: 4,
				range: 60,
			},
			keys: {
				chance: 0.8,
				minimum: 1,
				range: 15,
			},
			apples: {
				chance: 1,
				minimum: 2,
				range: 23,
			},
			hub: 0.75,
			character: 0.7,
			leveltype: 0.5,
		}
	}
};

module.exports = chance;