var http = require('http');
var getJSON = require('get-json');
var extern = {};

extern.getRandoJson = function(data, rando_link, cb_true, cb_false) {
	try {
		var rando_json;
		var url = rando_link.concat("&json");
		if (url.substr(0, 5) == "https")
			url = url.substr(0, 4) + url.substr(5);
		http.get(url, function(res) {
			res.setEncoding('utf8');
			var rawData = "";
			res.on("data", function(chunk) {
				rawData += chunk;
			});
			res.on("end", function() {
				rando_json = JSON.parse(rawData);

				// verify
				if (rando_json.template.name == "nexusdx" &&
					(rando_json.args.type == "stock" || rando_json.args.type == "atlas") &&
					rando_json.levels.length == 64 && rando_json.doors.length == 64) {
					data.rando_json = rando_json;
					cb_true(data);
				} else {
					cb_false();
				}
			});
		});

	} catch (e) {
		cb_false();
	}
}

module.exports = extern;