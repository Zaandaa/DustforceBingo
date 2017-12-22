var request = require("request");
var socket = require("socket.io");
var seedrandom = require('seedrandom');
var Bingo = require("./bingo");
var replays = require("./replays");

function build(io) {
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
		if(data == undefined)
			return;
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
		console.log("going to", url);
		request(url, function(error, response, body) {
			if (error || response == undefined ) {
				return lambda(true, `Could not connect to dustkid!`);
			}
			
			var json;
			try {
				json = JSON.parse(body)
			} catch(e) {
				return lambda(true, `Could not resolve on dustkid! (Try using your user id if there are multiple users with username ${name})`);
			}
			
			for (level in json.ranks_scores) {
				return lambda(false, json.ranks_scores[level].username, json.ranks_scores[level].user)
			}
			
			for (level in json.ranks_times) {
				return lambda(false, json.ranks_times[level].username, json.ranks_times[level].user)
			}
			
			lambda(true, 'This user has never completed a level (lol), could not find data about them')
		});
	}

// PUBLIC:

	io.on('connection', function(socket) {
		socket.custom = {};
		socket.on('init', function(data) {
			if (!verify(['username', 'session'], data, socket, 'connectionResponse'))
				return;
			
			if (!data.session in rooms) 
				return Error(socket, 'connectionResponse', `Session ${data.session} does not exist`);
			
			getUserInfo(data.username, function(err, username, id) {
				if(err) 
					return Error(socket, 'connectionResponse', username);
				
				socket.custom.username = username;
				socket.custom.id = id;
				rooms[data.session].addSocket(socket);
				
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
		
		socket.emit('start');
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
			return seed;
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
				if(!start) {
					emitAll(this, 'timerInterrupted');
				};
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
			
			bingo.addPlayer(socket.custom.id, socket.custom.username);
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
			return bingo.getBoardData()
		}
		
// CTOR:

		rooms[self.id] = self;
		
		return self;
	}

// EXTERN

	extern.newSession = function() {
		return Reflect.construct(Session, arguments);
	}
	
	return extern;
}
module.exports = build;