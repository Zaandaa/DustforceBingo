var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

var raw_data = ""

function create_parse(lambda) {
	return function () {
		if (this.readyState > 2) { // sent was called
			var orig_sz = data.length;
			data += this.responseText.substring(pos);
			pos = this.responseText.length;
			var sep_pos = data.indexOf("\x1e", orig_sz);
			while (sep_pos != -1) {
				if (sep_pos > 0) {
					var msg = JSON.parse(data.substr(0, sep_pos));
					lambda(msg);
				}
				sep_pos = data.indexOf("\x1e");
			}
		}
		if (this.readyState == 4) {
			start(lambda)
		}
	}
}
	
function start(lambda) {
	var req = new XMLHttpRequest();
	req.onreadystatechange = create_parse(lambda);
	req.open("GET", "/backend/events.php", true);
	req.send(null);
}

module.exports = start;