
var characters = ["Dustman", "Dustgirl", "Dustkid", "Dustworth"];
var hubs = ["Forest", "Mansion", "City", "Laboratory"];
var keys = ["Wood", "Silver", "Gold", "Ruby"];
var levelTypes = ["Open", "Wood", "Silver", "Gold"];

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
	if (i < 16) {
		return "Forest";
	} else if (i < 32) {
		return "Mansion";
	} else if (i < 48) {
		return "City";
	} else if (i < 64) {
		return "Laboratory";
	} else if (i < 72) {
		return "Difficult";
	} else {
		return "Tutorial";
	}
}

function getKey(i) {
	if (i >= 64) {
		return null;
	}
	return keys[Math.floor(i / 4) % 4];
}

function getLevelType(i) {
	if (i >= 64) {
		return null;
	}
	return levelTypes[Math.floor(i / 4) % 4];
}
