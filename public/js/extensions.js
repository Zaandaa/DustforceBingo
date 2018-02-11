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
	// var state = false;
	$(this).text(n1);
	return this.on('click', function() {
		var t = $(this).text() == n2 ? n1 : n2
		var d = true;
		if(typeof f === 'function')
			d = f(t);
		if(d) {				
			$(this).text(t);
			// state = !state;
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

// Remove 
//
// why does this not exist ffs
//
Array.prototype.remove = function() {
	var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
}