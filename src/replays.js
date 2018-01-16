var http = require('http');

var seperator = '\u001e';

var lastTimeToken = new Date().getTime().toString().slice(0, -3);

// bound by [timeout, 2*timeout)
function keepAlive(timeout, onTimeout) {
	var count = 0;
	var thisTimeToken = new Date().getTime().toString().slice(0, -3);
	function check() {
		var countCopy = count;
		setTimeout(function() {
			if(countCopy == count) {
				lastTimeToken = thisTimeToken;
				onTimeout();
			} else {
				check();
			}
		}, timeout)
	} check();
	return function() {
		count+=1;
	}
}

function createParser(lambda, updated) {
	var data="";
	return function (chunk) {
		updated();
		data += chunk;
		var items = data.split(seperator);
		data = items.pop();
		
		items.forEach(function(i) {
			if (i == "") 
				return;
			lambda(JSON.parse(i));
		});
	}
}
	
function start(lambda) {
	http.get("http://dustkid.com/backend/events.php?time_token=" 
			+ lastTimeToken,  
		function (res) {
			console.log("Connected to dustkid replays");
			res.setEncoding('utf8');
			var updated = keepAlive(30000, function() {
				console.log("Dustkid timed out, reconnecting to dustkid");
				res.destroy();
				start(lambda);
			});
			res.on('data', createParser(lambda, updated));
			res.on('error', function(e) {
				throw new Error(e);
			});
		}
	);
}

module.exports = start;