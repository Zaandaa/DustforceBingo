var http = require('http');
var fs = require('fs');
var utils = require('./utils');

var PADDING = new Array(39).join(" ")

var outputJson = require("./levels.json");
var extraData = require("./extraleveldata.json");

/*
 * Extension methods
 */

// applies applier to each element to a new array
Array.prototype.select = function(applier) 
{
	var output = new Array();
	this.forEach(function(n, i) 
	{
		output.push(applier(n, i));
	});
	return output;
}	

Array.prototype.syncMap = function(selector, doneCallback, name = "") 
{
	var queries = this.length;
	var funcs   = this.select(function(entity) 
	{
		return function(done) 
		{
			selector(entity, done);
		}
	})
	function run(i) 
	{
		if (i == funcs.length)
			return doneCallback();
		funcs[i](function()
		{
			run(i+1);
		});
	}
	
	run(0);
}

Array.prototype.convertToObject = function() 
{
	var newMe = {};
	for(var i = 0; i < this.length; i++) 
	{
		newMe[arguments[i]] = this[i];
	}
	return newMe;
};

Array.prototype.pushAll = function(array) 
{
	var self = this;
	array.forEach(function(obj) {
		self.push(obj);
	});
}

/*
 * Helpers
 */

function combine() 
{
	output = new Array();
	arguments[0].forEach(function(x, i) 
	{
		output[i] = new Array();
	})
	
	arguments.forEach(function(x) 
	{
		x.forEach(function(a, i) 
		{
			output[i].push(a);
		});
	});
	
	return output;
}



function getJSONWrapper(url, timeout, callback) 
{
	this.url     = url
	this.request = ++getJSONWrapper.Request;
	this.attempt = 0;
	this.done    = false;
	//console.log("Request", request, url);
	
	function retry () {
		console.log(PADDING, url);
		if(this.done)
			return;
		
		var currentAttempt = ++this.attempt;
		
		http.get(url, function(res) 
		{
			const { statusCode } = res;
			
			function checkAttempt()
			{
				if(currentAttempt != this.attempt)  // timed out by our end
				{
					res.destroy();
					return false;
				}
				return true;
			}
				
			if (statusCode !== 200) 
			{
				res.destroy()
				return;
			}
			
			res.setEncoding('utf8');
			var rawData;
			
			res.on('data', (chunk) => 
			{ 
				if(!checkAttempt()) 
					res.destroy();
				
				rawData += chunk 
			});
			res.on('end', () => 
			{
				if(!checkAttempt()) 
				{
					res.destroy()
					return;
				}
				
				try 
				{
					if (rawData.substring(0,9) == "undefined")
					{
						rawData = rawData.substring(9);
					}
					
					var json = JSON.parse(rawData);
					callback(json);
				}
				catch(e) 
				{
					console.log(rawData);
					throw e;
				}
			});
		}).on('error', (error) =>
		{		
			if(error && error.code == 'ECONNRESET') // timed out by their end
				retry();
			
			else                                    // some other error
				throw error;
		});
	} 
	
	retry();
}

getJSONWrapper.Request = 0;

function isSS(replay) 
{
	return replay.score_completion == 5 && replay.score_finesse == 5;
}

function getLastThreshold(gimmick, total) 
{
	var thresholds = difficultyThresholds[gimmick]
	for (var i = 0; i < thresholds.length; i++)
	{
		if (thresholds[i] >= total)
			return i;
	}
	return 7;
}

function finalEdits(levelsOutput) {
	function matchGimmick(level, newGimmick, callback) {
		levelsOutput[level.level].gimmicks.forEach(function(gimmick) {
			if (gimmick.type == newGimmick.type && gimmick.objective == newGimmick.objective && gimmick.count == newGimmick.count)
				callback(gimmick);
		});
	}

	function editGimmick(oldGimmick, newGimmick) {
		for (var k in newGimmick) {
			oldGimmick[k] = newGimmick[k];
		}
	}

	extraData.edit.forEach(function(level) {
		for (var key in level.data) {
			if (key == "gimmicks")
				level.data.gimmicks.forEach(function(newGimmick) {
					matchGimmick(level, newGimmick, (matchedGimmick) => editGimmick(matchedGimmick, newGimmick));
				});
			else
				levelsOutput[level.level][key] = level.data[key];
		}
	});
}


/*
 * Main function
 */

 
function preload(callback) 
{
	var records = {}
	var jobs = characters.select(function(c) 
	{ 
		return {
			token : c,
			url   : "http://dustkid.com/json/records/" + leaderboards["characters"][c]
		};
	});
	
	jobs.push(
	{
		token : "unload",
		url   : "http://dustkid.com/json/records/unload/all"
	});
	jobs.push(
	{
		token : "genocide",
		url   : "http://dustkid.com/json/records/genocide/all"
	});
	
	jobs.syncMap(function(job, done) 
	{
		getJSONWrapper(job.url, 30000, function(response) 
		{
			records[job.token == "" ? "Any" : job.token] = response;
			done();
		});
	},	
	function() 
	{
		callback(records);
	}, "Preload");
}

function main(levels, records, callback) 
{
	var levelsOutput = {};
	outputJson.levels = levelsOutput;
	var unloads = records["unload"]["Unload%"];
	var oobs    = records["unload"]["OOB%"];
	levels.syncMap(function(text, levelDone) 
	{
		var level = text.split('\t').convertToObject('level', 'hub', 'type')
		
		levelsOutput[level.level] = level;
		
		level.id = leaderboards["levels"][level.level];
		level.key = keyfromtype[level.type];
		
		var timerecord  = records["Any"]["Times"] [level.id]
		var scorerecord = records["Any"]["Scores"][level.id]
		var genociderecord = records["genocide"]["Genocide"][level.id]
		
		level.nosuper = {
			Beat : timerecord .input_super > 0,
			SS   : scorerecord.input_super > 0,
		},
		level.sfinesse   = timerecord.score_finesse != 5 || level.type == "Gold" || level.type == "Difficult",
		level.dcomplete  = timerecord.score_completion != 1,
		level.genocide   = forceGenocide.includes(level.level),
		level.unload     = unloads[level.id] !== undefined,
		level.oob        = oobs[level.id] !== undefined,
		level.charselect = level.type != "Tutorial",
		level.gimmicks   = []

		if (level.level in extraData.add) {
			for (var g in extraData.add[level.level].gimmicks) {
				if (gimmicks.includes(extraData.add[level.level].gimmicks[g].type))
					level.gimmicks.push(extraData.add[level.level].gimmicks[g]);
			}
		}

		gimmicks.syncMap(function(gimmick, gimmickDone) 
		{
			var url = "http://dustkid.com/json/level/" + level.id + "/" 
				+ leaderboards["gimmicks"][gimmick] + "/0/" + gimmickLeaderboardSize[gimmick];
			getJSONWrapper(url, 30000, function(top50)
			{
				completions.syncMap(function(objective, completionDone) 
				{
					console.log(utils.pad("left", level.level, 17), utils.pad("left", gimmick, 12), utils.pad("left", objective, 4));
					
					var leaderboard = getLeaderboard(top50, objective, gimmick, timerecord, scorerecord, genociderecord);
					
					console.log(PADDING, utils.pad("left", leaderboard.length, 2), "replay(s)");
					
					leaderboard.forEach(function(r) {
						console.log(PADDING + "  ", utils.getReplayScore(r), "rank:", utils.pad("left", r.rank, 2), "count:", utils.pad("left", r.access(gimmick), 2), "user:", r.user); 
					});
					
					if(leaderboard.length == 0) 
					{
						completionDone();
						return;
					}
					
					var histogram = getHist(leaderboard, gimmick);
			
					console.log(PADDING, utils.pad("left", histogram.length, 2), "bin(s)");
					
					histogram.forEach(function(h) {
						console.log(PADDING + "  ", "rank:", utils.pad("left", h.rank, 2), "ties:", utils.pad("left", h.ties, 2), "count:", utils.pad("left", h.count, 2));
					});
					
					var difficulties = getDifficulty(histogram, gimmick);
					
					console.log(PADDING, utils.pad("left", difficulties.length, 2), "gimmick(s)");
					
					difficulties.forEach(function(d) {
						console.log(PADDING + "  ", "difficulty:", d.difficulty, "count:", utils.pad("left", d.count, 2));
					});
					
					level.gimmicks.pushAll(
						difficulties.select(function(diff) 
						{
							return {
								type       : gimmick,
								objective  : objective,
								difficulty : diff.difficulty,
								count      : diff.count,
								character  : gimmick == "apples"
							};
						})
					);
					
					completionDone();
				}, gimmickDone, "Completion");
			});
		}, levelDone, "Gimmick");
	},
	function() 
	{
		finalEdits(levelsOutput);
		callback();
	}, "Level");
}

function getLeaderboard(top50, objective, gimmick, timerecord, scorerecord, genociderecord) 
{
	var replays = Object.values(top50[leaderboards["completions"][objective]]);
	
	replays.forEach(function(replay) 
	{
		replay.access = function(gimmick) 
		{
			if(gimmick == "lowattack")
				return this.input_super ? -1 : (3 * this.input_heavies + this.input_lights);
			return this[gimmickAccessor[gimmick]];
		}
	})
	
	
	for(var i = replays.length; i--; i > -1) 
	{
		if (replays[i].time > 180000)
			replays.splice(i, 1);
	}

	replays.sort(function(a, b) 
	{
		var count  = a.access(gimmick) - b.access(gimmick);
		if (count != 0) 
			return gimmick == "apples" ? -count : count;
		
		if (objective == "SS") {
			var completion = b.score_completion - a.score_completion;
			if (completion != 0) 
				return completion;
			
			var finesse = b.score_finesse - a.score_finesse;
			if(finesse != 0)  {
				return finesse;
			}
		}
		return a.time - b.time
	});
	
	for(var i = replays.length; i--; i > -1) 
	{
		replays[i].rank = i;
		if(  (objective == "SS" && !isSS(replays[i]))
		  || (replays[i].access(gimmick) >= inputMaxProbablyIntended[gimmick])
		  || (gimmick == "apples" && replays[i].access("apples") == 0)
		  || (replays[i].access(gimmick) < 0)
		  || (gimmick == "lowattack" && objective == "SS" && replays[i].access(gimmick) >= utils.accessGimmick(genociderecord, gimmick) && utils.accessGimmick(genociderecord, gimmick) > -1)
		  || (gimmick == "lowattack" && objective == "Beat" && replays[i].access(gimmick) >= utils.accessGimmick(timerecord, gimmick) && utils.accessGimmick(timerecord, gimmick) > -1)
		)
			replays.splice(i, 1);
	}
	


	return replays;
}

function getHist(replays, gimmick) 
{
	var output  = []
	var current = {
		rank  : replays[0].rank,
		ties  : 0,
		count : replays[0].access(gimmick)
	};
	replays.forEach(function(replay) {
		var count = replay.access(gimmick);
		if (current.count == count) 
		{
			current.ties += 1;
		} 
		else 
		{
			output.push(current);
			current = {
				rank: replay.rank,
				ties: 1,
				count: count
			}
		}
	});
	output.push(current);
	
	return output;
}

function getDifficulty(histogram, gimmick) 
{
	var output         = []	
	var previous       = histogram[0].count;
	var done           = false;
	var lastDifficulty = -1;

	histogram.forEach(function(h) 
	{
		difficulty = getLastThreshold(gimmick, h.rank + h.ties);
		if ((difficulty > 6 && output.length != 0) || (difficulty == lastDifficulty && gimmick != "apples"))
			done = true;
		
		if(done)
			return;

		lastDifficulty = difficulty;
		
		output.push({
			difficulty : difficulty + 1,
			count      : h.count
		});
	});
	
	return output;
}

/*
 * Data
 */
const gimmicks = [
	"apples",
	"lowdash",
	"lowjump",
	"lowdirection",
	"lowattack"
];
 
const difficultyThresholds = { // total achieved per difficulty tier
	"apples"       : [15, 35, 60, 70, 80, 90],
	"lowdash"      : [15, 35, 60, 70, 80, 90],
	"lowjump"      : [10, 20, 30, 35, 40, 45],
	"lowdirection" : [10, 20, 30, 35, 40, 45],
	"lowattack"    : [10, 20, 30, 35, 40, 45]
};

const inputMaxProbablyIntended = {
	"apples"       : 100, // all apples are intended, so this is effectively infinity
	"lowdash"      : 3,
	"lowjump"      : 10,
	"lowdirection" : 10,
	"lowattack"    : 20
};

const gimmickLeaderboardSize = {
	"apples"       : 100,
	"lowdash"      : 100,
	"lowjump"      : 50,
	"lowdirection" : 50,
	"lowattack"    : 50
}

const completions = [
	"Beat",
	"SS"
];

const characters = [
	"Dustman", 
	"Dustgirl", 
	"Dustkid", 
	"Dustworth",
	""
]

const levels = [
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

const leaderboards = {
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

const keyfromtype = {
	"Tutorial":null,
	"Open":"Wood",
	"Wood":"Silver",
	"Silver":"Gold",
	"Gold":"Red",
	"Difficult":null
}	

const gimmickAccessor = {
	"apples":"apples",
	"lowdash":"input_dashes",
	"lowjump":"input_jumps",
	"lowdirection":"input_directions",
	"lowattack":""
}

const forceGenocide = [
    "Combat Tutorial",
    "Downhill",
    "Fields",
    "Valley",
    "Firefly Forest",
    "Dusk Run",
    "Overgrown Temple",
    "Summit",
    "Grass Cave",
    "Ruins",
    "Ancient Garden",
    "Night Temple",
    "Secret Passage",
    "Mezzanine",
    "Caverns",
    "Cliffside Caves",
    "Library",
    "Courtyard",
    "Archive",
    "Knight Hall",
    "Ramparts",
    "Moon Temple",
    "Tower",
    "Vacant Lot",
    "Landfill",
    "Park",
    "Apartments",
    "Warehouse",
    "Forgotten Tunnel",
    "Basement",
    "Scaffolding",
    "Rooftops",
    "Concrete Temple",
    "Control",
    "Titan",
    "Vats",
    "Server Room",
    "Security",
    "Research",
    "Wiring",
    "Power Room",
    "Access",
    "Backup Shift",
    "Core Temple",
    "Abyss",
    "Dome",
    "Kilo Difficult",
    "Mega Difficult",
    "Giga Difficult",
    "Tera Difficult",
    "Peta Difficult",
    "Exa Difficult",
    "Zetta Difficult",
    "Yotta Difficult"
]

preload(function(records) {
	main(levels, records, function() { 
		fs.writeFile("./levels.json", JSON.stringify(outputJson, null, 4), function() {
			
		}); 
	});
});

setTimeout(function() {
	// head space
}, 30000)