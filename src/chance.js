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


var mode = "newgame"; // newgameplus

var chances = {
	newgame: {
		level: {
			chance: 0.5,
			beat: 0.5,
			ss: 1,
			character: 0.5,
			apple: 0,
		},
		total: {
			chance: 1,
			beat: {
				chance: 0.5,
				minimum: 4,
				range: 60,
			},
			ss: {
				chance: 1,
				minimum: 4,
				range: 60,
			},
			keys: {
				chance: 0,
				minimum: 1,
				range: 15,
			},
			apple: {
				chance: 0,
				minimum: 2,
				range: 48,
			},
			hub: 0.5,
			character: 0.5,
			leveltype: 0,
		}
	},
	newgameplus: {
		level: {
			chance: 0.5,
			beat: 0.5,
			ss: 1,
			character: 0.5,
			apple: 0,
		},
		total: {
			chance: 1,
			beat: {
				chance: 0.5,
				minimum: 4,
				range: 60,
			},
			ss: {
				chance: 1,
				minimum: 4,
				range: 60,
			},
			keys: {
				chance: 0,
				minimum: 1,
				range: 15,
			},
			apple: {
				chance: 0,
				minimum: 2,
				range: 48,
			},
			hub: 0.5,
			character: 0.5,
			leveltype: 0,
		}
	}
};
