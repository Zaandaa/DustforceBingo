var extern = {};
extern.characters = ["Dustman", "Dustgirl", "Dustkid", "Dustworth"];
extern.keys = ["Wood", "Silver", "Gold", "Red"];
extern.levelTypes = ["Open", "Wood", "Silver", "Gold"];
extern.levelObjectives = ["Beat", "SS", "S finesse", "S complete", "B complete", "D complete", "Genocide", "Unload", "OOB"];
extern.totalObjectives = ["Beat", "SS", "keys", "apples"];

extern.doors = {
	"Tutorial" : {
		"Tutorial": 0
	},
	"Difficult" : {
		"Difficult": 21
	},
	"Forest": {
		"Open": 5,
		"Wood": 23,
		"Silver": 10,
		"Gold": 11
	},
	"Mansion": {
		"Open": 1,
		"Wood": 22,
		"Silver": 2,
		"Gold": 3
	},
	"City": {
		"Open": 13,
		"Wood": 24,
		"Silver": 14,
		"Gold": 15
	},
	"Laboratory": {
		"Open": 17,
		"Wood": 25,
		"Silver": 18,
		"Gold": 19
	}
};

defaultLevelIds = 	["alcoves", "atrium", "mezzanine", "secretpassage",
					"dahlia", "fields", "downhill", "shadedgrove",
					"development", "abandoned", "vacantlot", "sprawl",
					"satellite", "control", "ferrofluid", "titan",
					"cave", "cliffsidecaves", "courtyard", "library",
					"momentum2", "fireflyforest", "tunnels", "momentum",
					"chemworld", "boxes", "factory", "park",
					"vat", "security", "venom", "mary",
					"ramparts", "precarious", "arena", "treasureroom",
					"summit", "suntemple", "ascent", "grasscave",
					"cityrun", "tunnel", "scaffold", "basement",
					"pod", "orb", "containment", "wiringfixed",
					"brimstone", "parapets", "observatory", "moontemple",
					"hyperdifficult", "garden", "autumnforest", "den",
					"hideout", "concretetemple", "clocktower", "alley",
					"coretemple", "abyss", "dome", "mary2",
					"kilodifficult", "megadifficult", "gigadifficult", "teradifficult",
					"petadifficult", "exadifficult", "zettadifficult", "yottadifficult",
					"newtutorial1", "newtutorial2", "newtutorial3"];
defaultLevelDoors = [1, 1, 1, 1, 5, 5, 5, 5, 13, 13, 13, 13, 17, 17, 17, 17,
					22, 22, 22, 22, 23, 23, 23, 23, 24, 24, 24, 24, 25, 25, 25, 25,
					2, 2, 2, 2, 10, 10, 10, 10, 14, 14, 14, 14, 18, 18, 18, 18,
					3, 3, 3, 3, 11, 11, 11, 11, 15, 15, 15, 15, 19, 19, 19, 19,
					21, 21, 21, 21, 21, 21, 21, 21, 0, 0, 0];

extern.defaultLevelset = {};
for (var i = 0; i < defaultLevelIds.length; i++) {
	extern.defaultLevelset[defaultLevelIds[i]] = defaultLevelDoors[i];
}

/* moved to options.json
extern.optionNames = {
	"beat": "beat levels",
	"ss": "SS levels",
	"keys": "get keys",
	"multilevel": "multiple levels",
	"characters": "characters",
	"apples": "apples",
	"tutorials": "tutorials",
	"difficults": "difficults",
	"yottass": "Yotta SS",
	"sfinesse": "S finesse",
	"scomplete": "S completion",
	"bcomplete": "B completion",
	"dcomplete": "D completion",
	"nosuper": "restrict super",
	"genocide": "genocide",
	"unload": "unload",
	"lowdash": "low dash",
	"lowjump": "low jump",
	"lowattack": "low attack",
	"lowdirection": "low direction"
}*/


module.exports = extern;