var socket = io();

$(document).on('ready', function() {
	socket.emit('init', {session: sessionId});

	function joinEmitted() {
		$('#username').disable();
		$('#join').disable();
		$('.alert-info').show();
	}
	
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
			// console.log(name, obj);
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

	// Alert 
	// 
	// fades in for n, then fades after h milliseconds for m milliseconds
	//
	// - n: lenght of fade in
	// - h: delay until autohide
	// - m: length of fade out
	$.fn.alert = function(n, h, m) {
		$('.alert').hide();
		var $this = $(this);
		$this.fadeIn(n);
		setTimeout(function() {
			$this.fadeOut(m);
		}, h);
	}
	
	$(".alert").hide();
	$(".close").on("click", function() {
		$(".alert").hide();
	})
	
	// USERNAME
	
	$('#username')
	.enableOn('removed')
	.disableOn('joinResponse', function(res) {
		return !res.err;
	})
	.disableOn('board');

	// USERNAME FORM
	
	$('#username_form').submit(function(e) {
		joinEmitted();
		e.preventDefault();
		if ($('#join').text() == "Join") {
			socket.emit('join', {
				username: $('#username').val(),
				session: sessionId
			});
		}
	});
	
	// JOIN
	
	$('#join')
	.emitter(function() {
		if ($(this).text() == "Join") {
			joinEmitted();
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
	
	// READY
	
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
	
	// COLOR
	
	var $color = $('#color');
	$color
	.on('click', function() {
		$('#color_container').show();
		
		var $container = $('#color_container'),
			bounds = {};
		    bounds.top  = $container.offset().top;
			bounds.left = $container.offset().left;
			bounds.bottom = bounds.top  + $container.outerHeight();
			bounds.right  = bounds.left + $container.outerWidth();
		
		var oldColor = $color.attr("style"),
		    oldVal   = $color.attr("value");
		
		var colors = [];
		
		$('.colorpicker').each(function() {
			var obj = {},
			    $this = $(this);
			obj.top  = $this.offset().top;
			obj.left = $this.offset().left;
			obj.bottom = obj.top  + $this.outerHeight();
			obj.right  = obj.left + $this.outerWidth();
			obj.target = $this;
			
			colors.push(obj);
		});
		
		function inBounds(e, b) {
			return e.pageY >= b.top && e.pageY <= b.bottom && e.pageX <= b.right && e.pageX >= b.left
		}
		
		var preventFirst = true;
		
		$(document).on('mousemove', function(e) {
			if (inBounds(e, bounds)) {
				$.each(colors, function() {
					if (inBounds(e, this)) {
						$color.attr("style", this.target.attr("style"));
					}
				});
			}
		})
		.on('click', function(e) {
			if(preventFirst) {
				preventFirst = false;
				return;
			}
			if (inBounds(e, bounds)) {
				$.each(colors, function() {
					if (inBounds(e, this)) {
						$color.attr("style", this.target.attr("style"));
						$color.attr("value", this.target.attr("value"));
					}
				});
				
				socket.emit('color', { color : $color.attr("value") });
			} else {
				$color.attr("style", oldColor);
				$color.attr("value", oldVal);
			}
			
			$('#color_container').hide();
			$(document).unbind('mousemove click');
		});
	})
	.disable()
	.enableOn('joinResponse', function(res) {
		return !res.err;
	}).disableOn('removed');
	
	// START
	
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
			$(".alert-danger .alert-text").html(data.message);
			$(".alert-danger").alert(200, 2000, 100);
		} else {
			// console.log(data.message);
		}
	});
	
	
	socket.on('joinResponse', function(data) {
		$("#join").enable();
		if(data.err) {
			$(".alert-danger .alert-text").html(data.message);
			$(".alert-danger").alert(200, 5000, 100);
			$("#join").text("Join");
			$("#username").enable();
		} else {
			// console.log(data.message);
			$(".alert-success").alert(200, 1000, 100);
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
	});
	
	socket.on('playerfinish', function(data) {
		// console.log("got playerfinish", data);
		playerFinish(data);
	});
	
	socket.on('multiple', function(data) {
		
		var $chooser = $('.chooser');
		$chooser.html("");
		data.forEach(function(player) {
			var row = $("<div class='row mt-2'/>");
			
			var padder = $("<div class='col-3'/>");
			var ref = $("<div class='col-3 id-info'/>");
			var me = $("<div class='col-3'/>");
			var button = $("<button class='btn btn-sm' type='button' aria-label='Close'>This is me!</button>")
			
			ref.html("<a href='http://dustkid.com/profile/" + player.id + "/" + player.name 
				+ "' target='_blank'>ID: " + player.id + "</a>");
				
			me.append(button);
			row.append(padder);
			row.append(ref);
			row.append(me);
			$chooser.append(row);
			
			button.on('click', function() {
				socket.emit('multichoose', player.id);
			});
		});
		$('.alert').hide();
		$('.multiple').show();
	});
	
	socket.on('finish', function(data) { 
		
	});
});