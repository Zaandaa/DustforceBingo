
var maxSeedLength = 5;
var seedChars = "1234567890qwertyuiopasdfghjklzxcvbnm";

var characters = ["Dustman", "Dustgirl", "Dustkid", "Dustworth"];
var hubs = ["Forest", "Mansion", "City", "Laboratory"];
var keytypes = ["Wood", "Silver", "Gold", "Ruby"];
var leveltypes = ["Open", "Wood", "Silver", "Gold"];

var levels = [
	"Downhill",
	"Shaded Grove",
	"Dahlia",
	"Fields",
	"Valley",
	"Firefly Forest",
	"Tunnels",
	"Dusk Run",
	"Overgrown Temple",
	"Ascent",
	"Summit",
	"Grass Cave",
	"Wild Den",
	"Ruins",
	"Ancient Garden",
	"Night Temple",
	"Atrium",
	"Secret Passage",
	"Alcoves",
	"Mezzanine",
	"Caverns",
	"Cliffside Caves",
	"Library",
	"Courtyard",
	"Archive",
	"Knight Hall",
	"Store Room",
	"Ramparts",
	"Moon Temple",
	"Observatory",
	"Ghost Parapets",
	"Tower",
	"Vacant Lot",
	"Landfill",
	"Development",
	"Abandoned Carpark",
	"Park",
	"Construction Site",
	"Apartments",
	"Warehouse",
	"Forgotten Tunnel",
	"Basement",
	"Scaffolding",
	"Rooftops",
	"Clocktower",
	"Concrete Temple",
	"Alleyway",
	"Hideout",
	"Control",
	"Ferrofluid",
	"Titan",
	"Satellite Debris",
	"Vats",
	"Server Room",
	"Security",
	"Research",
	"Wiring",
	"Containment",
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
	"Yotta Difficult",
	"Beginner Tutorial",
	"Combat Tutorial",
	"Advanced Tutorial"
]

function getHub(i) {
	switch (i) {
		case 0: return "Forest";
		case 16: return "Mansion";
		case 32: return "City";
		case 48: return "Laboratory";
		case 64: return "Difficult";
		case 72: return "Tutorial";
		default: return null;
	}
}

function getKey(i) {
	if (i >= 64) {
		return null;
	}
	switch (i / 4 % 4) {
		case 0: return null;
		case 1: return "Wood";
		case 2: return "Silver";
		case 3: return "Gold";
	}
}
