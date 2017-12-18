
var maxSeedLength = 5;
var seedChars = "1234567890qwertyuiopasdfghjklzxcvbnm";

function generateSeed() {
	Math.seedrandom();
	var seed = "";
	for (var i = 0; i < maxSeedLength; i++) {
		seed += seedChars.charAt(Math.floor(Math.random() * seedChars.length));
	}
	$("#seed").val(seed);
}

function copySeed() {
	$("#seed").select();
	document.execCommand("copy");
}
