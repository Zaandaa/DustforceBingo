var getJSON = require("get-json");
var socket = require("socket.io");
var seedrandom = require('seedrandom');
var Bingo = require("./bingo");
var replays = require("./replays");
var io = socket(8000);

var extern = {};

/*
 * Connections
 */
 
 // INTERNAL:
	var rooms = {};
 
	function Error(socket, res, message) {
		socket.emit(res, {
			err: true,
			message: message
		});
	}

	function verify(fields, data, socket, res) {
		var b = true;
		fields.forEach(function(field) {
			if (!(field in data)) {
				Error(socket, res, 'Invalid input!')
				b = false;
			}
		});
		return b;
	}

	function getUserInfo(name, lambda) {
		var url = `http://www.dustkid.com/json/profile/${name.toLowerCase()}`;
		getJSON(url, function(error, response) {
			if (error || !response.ok) {
				lambda(false, `Could not resolve on dustkid! (Try using your user id if there are multiple users with username ${name}))`);
			}
			
			for (level in response.result.ranks_scores) {
				return lambda(true, response.result.ranks_scores[level].username, response.result.ranks_scores[level].user)
			}
			
			for (level in response.result.ranks_times) {
				return lambda(true, response.result.ranks_scores[level].username, response.result.ranks_scores[level].user)
			}
			
			lambda(false, 'This user has never completed a level (lol), could not find data about them')
		});
	}

// PUBLIC:

io.on('connection', function(socket) {
	socket.custom = {};
	socket.on('connect', function(data) {
		if (!verify(['username', 'session'], data, socket, 'connectionResponse'))
			return;
		
		if (!data.session in rooms) 
			return Error(socket, 'connectionResponse', `Session ${data.session} does not exist`);
		
		getUserInfo(data.username, function(err, username, id) {
			if(err) 
				return Error(socket, 'connectionResponse', username);
			
			socket.custom.username = username;
			socket.custom.id = id;
			addSocket(rooms[data.session], socket);
			
			socket.emit('connectionResponse', {
				err: false,
				message: `Added ${data.username}`
			});
		})
	});	
	
	socket.on('view', function(data) {
		if (!verify(['session'], data, socket, 'viewResponse'))
			return;
		
		if (!data.session in rooms) 
			return Error(socket, 'viewResponse', `Session ${data.session} does not exist`);
		
		socket.emit('viewResponse', {
			err: false,
			board: rooms[data.session].board.get_board()
		});
	});
})

extern.getSession = function(id) {
	return rooms[id];
}

/*
 * Sessions
 */

seedrandom();
function Session(bingo_args) {
	var self = this;
	console.log(bingo_args);
	
// PRIVATE:

	var start = false;
	var canStart = false;
	var sockets = {};

	var seedChars = "1234567890qwertyuiopasdfghjklzxcvbnm";
	var seedLength = 8;
	function generateSeed() {
		var seed = "";
		for (var i = 0; i < seedLength; i++) {
			seed += seedChars.charAt(Math.floor(Math.random() * seedChars.length));
		}
	}

	self.id = generateSeed();
	while(self.id in rooms)
		self.id = generateSeed();
	bingo_args.seed = self.id;

	var bingo = new Bingo(self, bingo_args);

	function emitAll(res, mes) {
		for (id in sockets) {
			sockets[id].emit(res, mes);
		}
	}
	
	function startTimer(timespan) {
		if (!canStart || start) return;
		start = true;
		bingo.start();
		
		emitAll(this, 'startingTimer', timespan);
		
		setTimeout(timespan, function() {
			if(!start) return;
			bingo.reveal();
		});
	};

// PUBLIC:
	
	self.addSocket = function (socket)
	{
		sockets[socket.custom.id] = socket;
		socket.on('disconnect', function() {
			bingo.removePlayer(socket.custom.id);
		});
		
		socket.on('ready', function() {
			bingo.ready(socket.custom.id);
		})
		
		socket.on('unready', function() {
			bingo.ready(socket.custom.id);
		});
		
		socket.on('start', function() {
			startTimer(5000);
		});
		
		socket.on('unstart', function() {
			start = false;
		});
		
		session.bingo.addPlayer(socket.custom.id, socket.custom.username);
	}
	
	self.canStart = function(state) {
		canStart = state;
		emitAll('updateStart', state);
	};
	
	self.updateBoard = function(json) {
		emitAll('board', json);
	};
	
	self.finish = function() {
		emitAll('finish');
	};
	
	self.getBoardData = function() {
		return self.bingo.getBoardData()
	}
	
// CTOR:

	rooms[self.id] = self;
}

// EXTERN

extern.newSession = function() {
	return new (Function.prototype.bind.apply(Session, arguments));
}

module.exports = extern;
