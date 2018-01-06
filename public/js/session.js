var socket = io();

$(document).on('ready', function() {
	socket.emit('init', {session: sessionId});

	// ELEMENTS:
	
	function resolve(t, l, a) {
		if(typeof l === 'function')
			return l.bind(t)(a);
		else if (typeof l === typeof undefined)
			return true;
		else
			return l;
	}	
	
	$.fn.hasAttr = function(name) {  
		return typeof $(this).attr(name) !== typeof undefined && $(this).attr(name) !== false;
	};
	
	$.fn.disable = function() {
		return $(this).attr('disabled', 'disabled');
	}
	
	$.fn.enable = function() {
		return $(this).removeAttr('disabled');
	}
	// Emitter
	//
	// Emits a signal to the socket on click
	//  - n: the signal to submit on click n may be a function 
	//       resolved at click time or a string
	//  - l: (optional) delegate which returns if to submit the 
	//       event on click
	$.fn.emitter = function(n, l) {
		return this.on('click', function() {
			var name = resolve(this, n),
				obj = resolve(this, l);
			console.log(name, obj);
			if (typeof obj === typeof undefined)
				socket.emit(name);
			else
				socket.emit(name, obj);
		});
	};
	
	// Flop
	//
	// Flops button between two text values on click
	//  - n1: first name 
	//  - n2: second name
	//  -  f: (optional) delegate which returns if to flop
	$.fn.flop = function(n1, n2, f) {
		var state = false;
		$(this).text(n1);
		return this.on('click', function() {
			var t = state ? n1 : n2
			var d = true;
			if(typeof f === 'function')
				d = f(t);
			if(d) {				
				$(this).text(t);
				state = !state;
			}
		});
	};
	
	// setOn
	//
	// Sets state (for dual value buttons)
	//  - n: signal name from socket
	//  - v: value to set
	$.fn.setOn = function(n, v) {
		var t = this;
		socket.on(n, function(p) {
			$(t).text(v);
		});
		return $(this);
	};
	
	// EnableOn
	//
	// enables button on signal from socket
	//
	// - n: signal name from socket
	// - l: (optional) delegate which returns if to enable
    //      called with payload from event	
	$.fn.enableOn = function(n, l) {
		var t = this;
		socket.on(n, function(p) {
			if(resolve(t, l, p))
				$(t).enable();
		});
		return $(this);
	};
	
	// DisableOn
	// see: EnableOn
	$.fn.disableOn = function(n, l) {
		var t = this;
		socket.on(n, function(p) {
			if(resolve(t, l, p)) {
				$(t).disable();
			}
		});
		return $(this);
	};

	$('#username')
	.enableOn('removed')
	.disableOn('joinResponse', function(res) {
		return !res.err;
	})
	.disableOn('board');
	
	$('#join')
	.emitter(function() {
		if ($(this).text() == "Join") {
			$(this).disable();
			$("#connecting").collapse('show');
			return "join";
		}
		return "remove";
	}, function() {
		return {
			username: $('#username').val(),
			session: sessionId
		};
	})
	.flop("Join", "Remove")
	.setOn('removed', 'Join')
	.disableOn('startingTimer')
	// .enableOn('timerInterrupted')
	.disableOn('board');
	
	$('#ready')
	.disable()
	.emitter(function() {
		return $(this).text() == "Ready" ? 'ready' : 'unready';
	}).flop("Ready", "Unready")
	.enableOn('joinResponse', function(res) {
		return !res.err;
	}).disableOn('startingTimer')
	// .enableOn('timerInterrupted')
	.setOn('removed', 'Ready')
	.disableOn('removed')
	.disableOn('board');
	
	$('#color')
	.disable()
	.emitter('color', function() {
		return {
			color: $(this).val()
		};
	}).enableOn('joinResponse', function(res) {
		return !res.err;
	}).disableOn('removed');
	
	$('#start')
	.disable()
	.emitter(function() {
		$(this).disable();
		return "start";
	})
	.enableOn('updateStart', function(res) {
		return res;
	}).disableOn('updateStart', function(res) {
		return !res;
	}).disableOn('board');
	
	// SOCKETS:
	
	socket.on('connectionResponse', function(data) {
		if(data.err) {
			alert(data.message);
		} else {
			console.log(data.message);
		}
	});
	
	
	socket.on('joinResponse', function(data) {
		$("#join").enable();
		$("#connecting").collapse('hide');
		if(data.err) {
			alert(data.message);
			$("#join").text("Join");
		} else {
			console.log(data.message);
			$("#join").text("Remove");
		}
	});
	
	socket.on('updateStart', function(data) {
		
	});
	
	socket.on('startingTimer', function(data) {
		removeStartButton();
	});
	
	socket.on('timerInterrupted', function(data) {

	});
	
	socket.on('removed', function(data) {

	});
	
	socket.on('board', function(data) {
		// console.log("got board", data);
		updateBoardTable(data, $('#board_div'), true);
	});
	
	socket.on('players', function(data) {
		// console.log("got players", data);
		updatePlayersTable(data, $('#players_table_div'));
		// $(".collapse").collapse('show');
	});
	
	socket.on('finish', function(data) {
		
	});
});