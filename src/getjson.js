var control = 10;
var request = 0;
function getTop50(l, g, x) {
	url = "http://dustkid.com/json/level/" + leaderboards["levels"][l] + "/" + leaderboards["gimmicks"][g];

	// if(stopper) {
		// x({
			// "times":{},
			// "scores":{}
		// })
		// return;
	// }
	request++;
	var rno = request;
	console.log("Request", request, url);
	
	control -= 1;
	if (control == 0) {
		wait(10);
		control = 10;
		stopper = true;
	}	
	
	function retry () {
		getJSON(url, function(error, response) {
			if ((error && error.code == 'ECONNRESET') || (response === undefined)) {
				retry();
			} else if(error) {
				throw error;
			} else {
				x(response);
			}
		});
		
	} retry();
}

function wait(ms) {
    var start = Date.now(),
        now = start;
    while (now - start < ms) {
      now = Date.now();
    }
}
