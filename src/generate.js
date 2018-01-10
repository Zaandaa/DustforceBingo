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

function getRecordsJson(g) {
	// url = "dustkid.com/json/records/" + gimmickLeaderboards[g];
	// get json here
}

var gimmicks = [
	"apples",
	"lowdash",
	"lowjump",
	"lowdirection",
	"lowattack",
];

var gimmickLeaderboards = {
	"apples": "apple",
	"lowdash":"nodash",
	"lowjump":"nojump",
	"lowdirection":"nodirection",
	"lowattack":"noattack"
}

var cantss = [
	//
];

var levels = [
	"Beginner Tutorial	Tutorial	Tutorial	newtutorial1",
	"Combat Tutorial	Tutorial	Tutorial	newtutorial2",
	"Advanced Tutorial	Tutorial	Tutorial	newtutorial3",
	"Downhill	Forest	Open	downhill",
	"Shaded Grove	Forest	Open	shadedgrove",
	"Dahlia	Forest	Open	dahlia",
	"Fields	Forest	Open	fields",
	"Valley	Forest	Wood	momentum",
	"Firefly Forest	Forest	Wood	fireflyforest",
	"Tunnels	Forest	Wood	tunnels",
	"Dusk Run	Forest	Wood	momentum2",
	"Overgrown Temple	Forest	Silver	suntemple",
	"Ascent	Forest	Silver	ascent",
	"Summit	Forest	Silver	summit",
	"Grass Cave	Forest	Silver	grasscave",
	"Wild Den	Forest	Gold	den",
	"Ruins	Forest	Gold	autumnforest",
	"Ancient Garden	Forest	Gold	garden",
	"Night Temple	Forest	Gold	hyperdifficult",
	"Atrium	Mansion	Open	atrium",
	"Secret Passage	Mansion	Open	secretpassage",
	"Alcoves	Mansion	Open	alcoves",
	"Mezzanine	Mansion	Open	mezzanine",
	"Caverns	Mansion	Wood	cave",
	"Cliffside Caves	Mansion	Wood	cliffsidecaves",
	"Library	Mansion	Wood	library",
	"Courtyard	Mansion	Wood	courtyard",
	"Archive	Mansion	Silver	precarious",
	"Knight Hall	Mansion	Silver	treasureroom",
	"Store Room	Mansion	Silver	arena",
	"Ramparts	Mansion	Silver	ramparts",
	"Moon Temple	Mansion	Gold	moontemple",
	"Observatory	Mansion	Gold	observatory",
	"Ghost Parapets	Mansion	Gold	parapets",
	"Tower	Mansion	Gold	brimstone",
	"Vacant Lot	City	Open	vacantlot",
	"Landfill	City	Open	sprawl",
	"Development	City	Open	development",
	"Abandoned Carpark	City	Open	abandoned",
	"Park	City	Wood	park",
	"Construction Site	City	Wood	boxes",
	"Apartments	City	Wood	chemworld",
	"Warehouse	City	Wood	factory",
	"Forgotten Tunnel	City	Silver	tunnel",
	"Basement	City	Silver	basement",
	"Scaffolding	City	Silver	scaffold",
	"Rooftops	City	Silver	cityrun",
	"Clocktower	City	Gold	clocktower",
	"Concrete Temple	City	Gold	concretetemple",
	"Alleyway	City	Gold	alley",
	"Hideout	City	Gold	hideout",
	"Control	Laboratory	Open	control",
	"Ferrofluid	Laboratory	Open	ferrofluid",
	"Titan	Laboratory	Open	titan",
	"Satellite Debris	Laboratory	Open	satellite",
	"Vats	Laboratory	Wood	vat",
	"Server Room	Laboratory	Wood	venom",
	"Security	Laboratory	Wood	security",
	"Research	Laboratory	Wood	mary",
	"Wiring	Laboratory	Silver	wiringfixed",
	"Containment	Laboratory	Silver	containment",
	"Power Room	Laboratory	Silver	orb",
	"Access	Laboratory	Silver	pod",
	"Backup Shift	Laboratory	Gold	mary2",
	"Core Temple	Laboratory	Gold	coretemple",
	"Abyss	Laboratory	Gold	abyss",
	"Dome	Laboratory	Gold	dome",
	"Kilo Difficult	Difficult	Difficult	kilodifficult",
	"Mega Difficult	Difficult	Difficult	megadifficult",
	"Giga Difficult	Difficult	Difficult	gigadifficult",
	"Tera Difficult	Difficult	Difficult	teradifficult",
	"Peta Difficult	Difficult	Difficult	petadifficult",
	"Exa Difficult	Difficult	Difficult	exadifficult",
	"Zetta Difficult	Difficult	Difficult	zettadifficult",
	"Yotta Difficult	Difficult	Difficult	yottadifficult"
]

var keyfromtype = {
	"Tutorial":null,
	"Open":"Wood",
	"Wood":"Silver",
	"Silver":"Gold",
	"Gold":"Red",
	"Difficult":null
}	

var out = {}
levels.forEach(function(level) {
	var a = level.split('\t'),
		l = a[0],
		h = a[1],
		t = a[2],
		i = a[3];
		
	var x = {
		id: i,
		hub: h,
		type: t,
		key: keyfromtype[t],
		charselect: t != "Tutorial",
		gimmicks: []
	}
	
	gimmicks.forEach(function(g) {
		x.gimmicks.push(new base_gimmick(l, g, "Beat"));
		if(!cantss.includes(g))
			x.gimmicks.push(new base_gimmick(l, g, "SS"));
	})
	
	out[l] = x;
});
console.log(JSON.stringify(out, null, 4)); 