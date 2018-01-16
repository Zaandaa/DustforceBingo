var getJSON = require('get-json');
var utils = require('./utils');

function pre(callback) {
	var records = {}
	var queries = characters.length;
	characters.forEach(function(c) {
		url = "http://dustkid.com/json/records/" + leaderboards["characters"][c];
		getJSON(url, function(error, response) {
			if (error) throw new Error(error);
			records[c == "" ? "Any" : c] = response;
			queries--;
			console.log("Pre:", queries, "queries remain, finished", c);
			if(queries == 0) {
				callback(records);
			}
		});
	});
}

function main(levels, records, callback) {
	var out = {};
	var queries = levels.length * gimmicks.length * completions.length;
	levels.forEach(function(level) {
		var a = level.split('\t'),
			l = a[0],
			h = a[1],
			t = a[2],
			i = leaderboards["levels"][l];
			
		var beatrecord = records["Any"]["Times"][leaderboards["levels"][l]];
		var scorerecord = records["Any"]["Scores"][leaderboards["levels"][l]];
			
		var x = {
			id: i,
			hub: h,
			type: t,
			key: keyfromtype[t],
			nosuper: {
				Beat: beatrecord.input_super > 0,
				SS: scorerecord.input_super > 0
			},
			sfinesse: beatrecord.score_finesse != 5,
			dcomplete: beatrecord.score_completion != 1,
			genocide: beatrecord.tag.genocide != "1",
			charselect: t != "Tutorial",
			gimmicks: []
		}
		
		gimmicks.forEach(function(g) {
			// characters.forEach(function(c) {
				getTop50(l, g, function(top50) {
					completions.forEach(function(o) {
						var leaderboard = getLeaderboard(top50, o, g);
						if(leaderboard.length == 0) {
							queries --;
							console.log("Main:", queries, "queries remain,", "emtpy", l, g, o);
							return;
						}
						hist = getHist(leaderboard, g);
						diffs = getDifficulty(hist, g);
						diffs.forEach(function(d) {
							x.gimmicks.push({
								type: g,
								objective: o,
								difficulty: d.difficulty,
								count: d.value,
								character: g == "apple"
							});
						});
						out[l] = x;	
						queries --;
						console.log("Main:", queries, "queries remain,", "finished", l, g, o);
						if (queries == 0)
							callback(out);
					});
				});
			// });
		});
	});
}


const difficultyThresholds = { // total achieved per difficulty tier
	"apples": [2, 5, 10, 20, 30, 40, 50],
	"lowdash": [2, 5, 10, 20, 30, 40, 50],
	"lowjump": [1, 2, 5, 10, 20, 30, 40],
	"lowdirection": [0, 1, 2, 5, 10, 20, 30],
	"lowattack": [0, 0, 1, 2, 5, 10, 20],
}
const inputMinProbablyIntended = {
	"apples": 0,
	"lowdash":1,
	"lowjump":10,
	"lowdirection":20,
	"lowattack":30
};

function getLastThreshold(g, total) {
	for (i in difficultyThresholds[g]) {
		if (difficultyThresholds[g][i] >= total)
			return parseInt(i);
	}
	return 7;
}

function getDifficulty(hist, g) {
	var out = [];
	
	previous = hist[0].value;
	done = false;
	lastDifficulty = 0;

	hist.forEach(function(h) {
		d = getLastThreshold(g, h.rank + h.count);
		if (d > 6 || d == lastDifficulty)
			done = true;

		if(done)
			return;

		out.push({
			difficulty: d + 1,
			value: h.value
		});
		lastDifficulty = d;
	});
	
	return out;
}

var control = 10;
var request = 0;
function getTop50(l, g, x) {
	url = "http://dustkid.com/json/level/" + leaderboards["levels"][l] + "/" + leaderboards["gimmicks"][g];

	// if(stopper) {
		// x({
			// "times":{},
			// "scores":{}
		// })
		// return;
	// }
	request++;
	var rno = request;
	console.log("Request", request, url);
	
	control -= 1;
	if (control == 0) {
		wait(250);
		control = 10;
	}	
	
	function retry () {
		getJSON(url, function(error, response) {			
			if ((error && error.code == 'ECONNRESET') || (response === undefined)) {
				retry();
			} else if(error) {
				throw error;
			} else {
				x(response);
			}
		});
	} retry();
}

function wait(ms) {
    var start = Date.now(),
        now = start;
    while (now - start < ms) {
      now = Date.now();
    }
}

function getLeaderboard(top50, o, g) {
	var rs = Object.values(top50[leaderboards["completions"][o]]);
	
	for(var i = rs.length; i--; i > -1) {
		rs[i].rank = i;
		if(o == "SS" && !isSS(rs[i]))
			rs.splice(i, 1);
		else if(rs[i].time > 180000)
			rs.splice(i, 1);
		else if(g != "apples" && access(rs[i], g) > inputMinProbablyIntended[g])
			rs.splice(i, 1);
	}
	
	return rs;
}

function isSS(r) {
	return r.score_completion == 5 && r.score_finesse == 5;
}

function getHist(rs, g) {
	var out = []
	var cur = {
		rank: rs[0].rank,
		count: 0,
		value:access(rs[0], g)
	};
	rs.forEach(function(r) {
		var v = access(r, g);
		if (cur.value == v) {
			cur.count += 1;
		} else {
			out.push(cur);
			cur = {
				rank: r.rank,
				count: 1,
				value: v
			}
		}
	});
	
	out.push(cur);
	return out;
}

function access(r, g) {
	if(g == "lowattack")
		return r.input_super ? -1 : (3 * r.input_heavies + r.input_lights);
	return r[gimmickAccessor[g]];
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

var characters = [
	"Dustman", 
	"Dustgirl", 
	"Dustkid", 
	"Dustworth",
	""
]

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
	"characters": {
		"Dustman":"man",
		"Dustgirl":"girl",
		"Dustkid":"kid",
		"Dustworth":"worth",
		"":""
	},
	"levels":{
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
	"lowdash":"input_dashes",
	"lowjump":"input_dashes",
	"lowdirection":"input_dashes",
	"lowattack":""
}

pre(function(records) {
	main(levels, records, function(output) { 
		console.log(JSON.stringify(output, null, 4)); 
	});
});

wait(1000);