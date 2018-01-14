var getJSON = require('get-json');
var utils = require('./utils');

function base_gimmick(level, t, o) {
	return {
		type: t,
		objective: o,
		difficulty: getDifficulty(level, t, o),
		count: getCount(level, t, o),
		character: ""
	}
}

function getDifficulty(level, t, o) {
	var d = 0;

	// if (t == "apples")
		// d = utils.getLevelDifficulty(level, o, "New Game") - 1;

	return d;
}

function getCount(level, t, o) {
	var count = 0;

	// if (t == "apples")
		// count = 1;

	return count;
}

function getTop50(l, g, c, x) {
	url = "dustkid.com/json/level/" + leaderboards["levels"][l] + "/" 
			+ leaderboards["gimmicks"][g];
	
	getJSON(url, function(error, response) {
		if (error) throw new Error(error);
		
		var rs = response.result[leaderboards["completions"][c];
		
		if(c == "SS") {
			for(var i = rs.length; i--; i > -1) {
				if(!isSS(rs[i]))
					rs.splice(i, 1);
			}
		}
		
		x(rs);
	});
}

function isSS(r) {
	return r.score_completion == 5 && r.score_finesse == 5;
}

var gimmicks = [
	"apples",
	"lowdash",
	"lowjump",
	"lowdirection",
	"lowattack"
];

var completions = [
	"Beat",
	"SS"
];

var cantss = [
	//
];

var levels = [
	"Beginner Tutorial	Tutorial	Tutorial",
	"Combat Tutorial	Tutorial	Tutorial",
	"Advanced Tutorial	Tutorial	Tutorial",
	"Downhill	Forest	Open",
	"Shaded Grove	Forest	Open",
	"Dahlia	Forest	Open",
	"Fields	Forest	Open",
	"Valley	Forest	Wood",
	"Firefly Forest	Forest	Wood",
	"Tunnels	Forest	Wood",
	"Dusk Run	Forest	Wood",
	"Overgrown Temple	Forest	Silver",
	"Ascent	Forest	Silver",
	"Summit	Forest	Silver",
	"Grass Cave	Forest	Silver",
	"Wild Den	Forest	Gold",
	"Ruins	Forest	Gold",
	"Ancient Garden	Forest	Gold",
	"Night Temple	Forest	Gold",
	"Atrium	Mansion	Open",
	"Secret Passage	Mansion	Open",
	"Alcoves	Mansion	Open",
	"Mezzanine	Mansion	Open",
	"Caverns	Mansion	Wood",
	"Cliffside Caves	Mansion	Wood",
	"Library	Mansion	Wood",
	"Courtyard	Mansion	Wood",
	"Archive	Mansion	Silver",
	"Knight Hall	Mansion	Silver",
	"Store Room	Mansion	Silver",
	"Ramparts	Mansion	Silver",
	"Moon Temple	Mansion	Gold",
	"Observatory	Mansion	Gold",
	"Ghost Parapets	Mansion	Gold",
	"Tower	Mansion	Gold",
	"Vacant Lot	City	Open",
	"Landfill	City	Open",
	"Development	City	Open",
	"Abandoned Carpark	City	Open",
	"Park	City	Wood",
	"Construction Site	City	Wood",
	"Apartments	City	Wood",
	"Warehouse	City	Wood",
	"Forgotten Tunnel	City	Silver",
	"Basement	City	Silver",
	"Scaffolding	City	Silver",
	"Rooftops	City	Silver",
	"Clocktower	City	Gold",
	"Concrete Temple	City	Gold",
	"Alleyway	City	Gold",
	"Hideout	City	Gold",
	"Control	Laboratory	Open",
	"Ferrofluid	Laboratory	Open",
	"Titan	Laboratory	Open",
	"Satellite Debris	Laboratory	Open",
	"Vats	Laboratory	Wood",
	"Server Room	Laboratory	Wood",
	"Security	Laboratory	Wood",
	"Research	Laboratory	Wood",
	"Wiring	Laboratory	Silver",
	"Containment	Laboratory	Silver",
	"Power Room	Laboratory	Silver",
	"Access	Laboratory	Silver",
	"Backup Shift	Laboratory	Gold",
	"Core Temple	Laboratory	Gold",
	"Abyss	Laboratory	Gold",
	"Dome	Laboratory	Gold",
	"Kilo Difficult	Difficult	Difficult",
	"Mega Difficult	Difficult	Difficult",
	"Giga Difficult	Difficult	Difficult",
	"Tera Difficult	Difficult	Difficult",
	"Peta Difficult	Difficult	Difficult",
	"Exa Difficult	Difficult	Difficult",
	"Zetta Difficult	Difficult	Difficult",
	"Yotta Difficult	Difficult	Difficult"
]

var leaderboards = {
	"gimmicks":{
		// internal:external
		"apples": "apple",
		"lowdash":"nodash",
		"lowjump":"nojump",
		"lowdirection":"nodirection",
		"lowattack":"noattack"
	},
	"completions":{
		"Beat":"times",
		"SS":"scores"
	},
	"level":{
		"Beginner Tutorial": "newtutorial1",
		"Combat Tutorial": "newtutorial2",
		"Advanced Tutorial": "newtutorial3",
		"Downhill": "downhill",
		"Shaded Grove": "shadedgrove",
		"Dahlia": "dahlia",
		"Fields": "fields",
		"Valley": "momentum",
		"Firefly Forest": "fireflyforest",
		"Tunnels": "tunnels",
		"Dusk Run": "momentum2",
		"Overgrown Temple": "suntemple",
		"Ascent": "ascent",
		"Summit": "summit",
		"Grass Cave": "grasscave",
		"Wild Den": "den",
		"Ruins": "autumnforest",
		"Ancient Garden": "garden",
		"Night Temple": "hyperdifficult",
		"Atrium": "atrium",
		"Secret Passage": "secretpassage",
		"Alcoves": "alcoves",
		"Mezzanine": "mezzanine",
		"Caverns": "cave",
		"Cliffside Caves": "cliffsidecaves",
		"Library": "library",
		"Courtyard": "courtyard",
		"Archive": "precarious",
		"Knight Hall": "treasureroom",
		"Store Room": "arena",
		"Ramparts": "ramparts",
		"Moon Temple": "moontemple",
		"Observatory": "observatory",
		"Ghost Parapets": "parapets",
		"Tower": "brimstone",
		"Vacant Lot": "vacantlot",
		"Landfill": "sprawl",
		"Development": "development",
		"Abandoned Carpark": "abandoned",
		"Park": "park",
		"Construction Site": "boxes",
		"Apartments": "chemworld",
		"Warehouse": "factory",
		"Forgotten Tunnel": "tunnel",
		"Basement": "basement",
		"Scaffolding": "scaffold",
		"Rooftops": "cityrun",
		"Clocktower": "clocktower",
		"Concrete Temple": "concretetemple",
		"Alleyway": "alley",
		"Hideout": "hideout",
		"Control": "control",
		"Ferrofluid": "ferrofluid",
		"Titan": "titan",
		"Satellite Debris": "satellite",
		"Vats": "vat",
		"Server Room": "venom",
		"Security": "security",
		"Research": "mary",
		"Wiring": "wiringfixed",
		"Containment": "containment",
		"Power Room": "orb",
		"Access": "pod",
		"Backup Shift": "mary2",
		"Core Temple": "coretemple",
		"Abyss": "abyss",
		"Dome": "dome",
		"Kilo Difficult": "kilodifficult",
		"Mega Difficult": "megadifficult",
		"Giga Difficult": "gigadifficult",
		"Tera Difficult": "teradifficult",
		"Peta Difficult": "petadifficult",
		"Exa Difficult": "exadifficult",
		"Zetta Difficult": "zettadifficult",
		"Yotta Difficult": "yottadifficult"
	}
}

var keyfromtype = {
	"Tutorial":null,
	"Open":"Wood",
	"Wood":"Silver",
	"Silver":"Gold",
	"Gold":"Red",
	"Difficult":null
}	

var gimmickAccessor = {
	"apples":"apples",
	"lowdash":,
	"lowjump",
	"lowdirection",
	"lowattack"
}

var out = {}

levels.forEach(function(level) {
	var a = level.split('\t'),
		l = a[0],
		h = a[1],
		t = a[2],
		i = leaderboards["levels"][l];
		
	var x = {
		id: i,
		hub: h,
		type: t,
		key: keyfromtype[t],
		charselect: t != "Tutorial",
		gimmicks: []
	}

	gimmicks.forEach(function(g) {
		completions.forEach(function(c) {
			getTop50(l, g, c, function(top50) {
				if(top50.length == 0) 
					return;
				
			}
		});
	})
	
	out[l] = x;
});
console.log(JSON.stringify(out, null, 4)); 