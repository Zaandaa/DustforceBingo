var util = require('./utils');
var http = require('http');

var seperator = '\u001e';

var lastTimeToken = new Date().getTime().toString().slice(0, -3);
var timeout = 10200; //ms

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
		console.log((new Date().toLocaleString()), "Replay:", "Message from dustkid");
		
		data += chunk;
		var items = data.split(seperator);
		data = items.pop();
		if(items.length != 0)
			updated();
		
		items.forEach(function(i) {
			if (i == "") 
				return;
			
			var r = JSON.parse(i);
			console.log((new Date().toLocaleString()), "Replay:", util.getReplayScore(r) + util.pad("left", r.levelname, 19) + " " + util.pad("left", r.username, 20));	
			lambda(r);
		});
	}
}
	
function start(lambda) {
	http.get("http://dustkid.com/backend/events.php?time_token=" 
			+ new Date(lastTimeToken - timeout).getTime().toString().slice(0, -3), // double headroom  
		function (res) {
			console.log((new Date().toLocaleString()), "Replay:", "Connected to dustkid replays");
			res.setEncoding('utf8');
			var updated = keepAlive(timeout, function() {
				console.log((new Date().toLocaleString()), "Replay:", "Reconnecting to dustkid");
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