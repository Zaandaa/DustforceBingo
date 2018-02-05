var socket = io(window.location.origin, {
	path: '/bingo/socket.io'
});

function resetJoin() {
	$('#username').enable();
	$('#join').enable();
	$('#join').text("Join");
}

function changeCheckImage() {
	var id = $(this).attr('id');
	$('#check_' + id).attr('src', '/bingo/img/ready_' + ($(this).prop('checked') ? 'true' : 'false') + '.png');
}

$(document).on('ready', function() {
	$('input[type=checkbox]').on('change', changeCheckImage)

	socket.emit('init', {session: sessionId});

	function joinEmitted() {
		$('#username').disable();
		$('#join').disable();
		$('.alert-info').show();
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
	
	// VOTE RESET
	
	$('#reset')
	.disable()
	.emitter('voteReset')
	.enableOn('joinResponse', function(res) {
		return !res.err;
	}).disableOn('removed');
	
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
	}).disableOn('board')
	.disableOn('removed');
	
	// SOCKETS:
	
	socket.on('internalError', function() {
		$(".alert-danger .alert-text").html("<strong>Something went wrong!</strong> Please message TMC or Zaandaa");
		$(".alert-danger").alert(200, 5000, 100);
	});
	
	socket.on('connectionResponse', function(data) {
		if(data.err) {
			$(".alert-danger .alert-text").html(data.message);
			$(".alert-danger").alert(200, 5000, 100);
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
			player = data.id;
			$(".alert-success").alert(200, 1000, 100);
			$("#join").text("Remove");
		}
	});
	
	socket.on('updateStart', function(data) {
		
	});
	
	socket.on('startingTimer', function(data) {
		removeStartButton();
		$("#color").disable();
	});
	
	socket.on('timerInterrupted', function(data) {

	});
	
	socket.on('removed', function(data) {
		$("#color").attr("value", "white");
		$("#color").attr("style", "background-color:var(--white);");
	});
	
	socket.on('board', function(data) {
		// console.log("got board", data);
		updateBoardTable(JSON.parse(data), $('#board_div'), false);
	});
	
	socket.on('players', function(data) {
		// console.log("got players", data);
		updatePlayersTable(data, $('#players_table_div'));
	});
	
	socket.on('playerfinish', function(data) {
		// $("#tr_" + JSON.parse(data).player).addClass('player_finish_animation');
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
	
	socket.on('reset', function(data) {
		resetBingo();
	});
});