var socket = io();

$(document).on('ready', function() {
	
	// ELEMENTS:
	
	function resolve(t, l, a) {
		if(typeof l === 'function')
			return l.bind(t)(a);
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
			console.log("got", n);
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
			if(resolve(t, l, p))
				$(t).disable();
		});
		return $(this);
	};
	
	$('#join')
	.emitter('init', function() {
		return {
			username: $('#username').val(),
			session: sessionId
		};
	}).enableOn('start')
	.on('click', function() {
		$(this).disable();
	}).enableOn('connectionResponse', function(res) {
		return res.err;
	});
	
	$('#ready')
	.disable()
	.emitter(function() {
		return $(this).text() == "Ready" ? 'ready' : 'unready';
	}).flop("Ready", "Unready")
	.enableOn('connectionResponse', function(res) {
		return !res.err;
	}).disableOn('startingTimer')
	.enableOn('timerInterrupted');
	
	$('#start')
	.disable()
	.emitter(function() {
		return $(this).text() == "Start" ? "start" : "unstart";
	})
	.flop("Start", "Unstart")
	.enableOn('updateStart', function(res) {
		return res;
	}).disableOn('board');
	
	// SOCKETS:
	
	socket.on('connectionResponse', function(data) {
		if(data.err) {
			alert(data.message);
		} else {
			console.log(data.message);
		}
	});
	
	socket.on('viewResponse', function(data) {
		
	});
	
	socket.on('updateStart', function(data) {
		
	});
	
	socket.on('board', function(data) {
		console.log("got board", data);
		updateBoardTable(data, $('#board'));
	});
	
	socket.on('finish', function(data) {
		
	});
});