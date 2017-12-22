var http = require('http');

var seperator = '\u001e';

// bound by [timeout, 2*timeout)
function keepAlive(timeout, onTimeout) {
	var count;
	function check() {
		var countCopy = count;
		setTimeout(timeout, function() {
			if(countCopy == count)
				onTimeout();
			else
				check();
		})
	} check();
	return function() {
		count+=1;
	}
}

function createParser(lambda, updated) {
	var data="";
	return function (chunk) {
		console.log("recieved chunk", chunk);
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
			+ new Date().getTime().toString().slice(0, -3), 
		function (res) {
			res.setEncoding('utf8');
			var updated = keepAlive(10000, function() {
				res.abort();
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