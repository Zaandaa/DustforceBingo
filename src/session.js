var request = require("request");
var socket = require("socket.io");
var querystring = require('querystring')
var seedrandom = require('seedrandom');
var Bingo = require("./bingo");
var replays = require("./replays");

function build(io) {
	var extern = {};
	
/*
 * Connections
 */

 
// INTERNAL:
	extern.rooms = {};
 
	replays(function(r) {
		console.log("Replay: " + r.username);
		for(s in extern.rooms) {
			extern.rooms[s].receiveReplay(r);
		}
	})
 
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

	function tryParse(body, lambda) {
		try {
			return JSON.parse(body)
		} catch(e) {
			lambda(true, '<strong>Something went wrong :(</strong> I bet it was TMC\'s fault.');
			return undefined;
		}
	}
	
	function requestWrapper(url, lambda, callback) {
		request(url, function(error, response, body) {
			if (error || response == undefined ) {
				return lambda(true, '<strong>Hitbox server error</strong> Hitbox appears to be down');
			}
			
			var json;
			try {
				json = JSON.parse(body)
			} catch(e) {
				return lambda(true, '<strong>Something went wrong :(</strong> I bet it was TMC\'s fault.');
			}
			
			callback(json);
		});
	}
	
	function getUserJson(name, lambda, success) {
		var number = parseInt(name) 
		
		var url = 'http://df.hitboxteam.com/backend6/userSearch.php?' + querystring.stringify({
			'q':name
		});
		
		requestWrapper(url, lambda, function(json) {
			if (json.length == 0) {
				if (number == NaN) 
					return lambda(true, `<strong>User ${name} not found!</strong>`);
				var url = 'http://df.hitboxteam.com/backend6/userSearch.php' + querystring.stringify({
					'user_id':name
				});
				requestWrapper(url, lambda, function(json) {
					if (json.length == 0) 
						return lambda(true, `<strong>Username or id ${name} not found!</strong>`);
					
					return success(json)
				});
			} else {
				//REMOVE LATER
				if(json.length > 1)
					return lambda(true, `<strong>Multiple users with name ${name}!</strong> Try using your user id.`);
				
				return success(json)
			}
		});
	}

	function getUserInfo(name, lambda) {
		getUserJson(name, lambda, function(json) {
			if(json.length > 1) {
				// ADD HERE LATER
				return;
			}
			
			var user = json[0];
			if (user === undefined) {
				return lambda(true, '<strong>Internal server error</strong> Please contact @TMC or @Zaandaa they\'re dumb');
			}
			
			if (!("name" in user) || !("id" in user)) {
				return lambda(true, '<strong>Hitbox server error</strong> Hitbox appears to be down');
			}	
			
			lambda(true, user.name, user.id);
		});
	}
	
// PUBLIC:

	io.on('connection', function(socket) {
		socket.custom = {};
		socket.on('init', function(data) {
			if (!(data.session in extern.rooms)) 
				return Error(socket, 'connectionResponse', `Session ${data.session} does not exist`);

			extern.rooms[data.session].addSocket(socket, function(err, message) {
				socket.emit('connectionResponse', {
					err: err,
					message: message
				});
			});
		});
	})

	extern.getSession = function(id) {
		return extern.rooms[id];
	}

/*
 * Sessions
 */

	seedrandom();
	function Session(bingo_args) {
		var self = this;
		self.bingo_args = bingo_args;
		
// PRIVATE:

		var start = false;
		var canStart = false;
		var finished = false;
		var sockets = [];

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
		while(self.id in extern.rooms)
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
			
			// console.log("side a", canStart, start);
			emitAll('startingTimer', { time: timespan });
			// console.log("side b", canStart, start);
			
			setTimeout(function() {
				// console.log("starting", start);
				// if(!start) {
					// emitAll(this, 'timerInterrupted');
				// };
				bingo.start();
			}, timespan);
		};

		function cleanup() {
			// delete references
			for (var s in sockets) {
				// sockets[s].destroy(); // not a function?
				delete sockets[s];
			}
			delete sockets;

			bingo.cleanup();
			delete bingo;

			delete extern.rooms[self.id];
			delete self;
		}

// PUBLIC:
		
		self.addSocket = function (socket, lambda)
		{

			sockets.push(socket);
			
			socket.on('disconnect', function() {
				if (socket.custom.id)
					bingo.removePlayer(socket.custom.id);
				sockets.splice(sockets.indexOf(socket), 1);
				socket.disconnect(0);
				delete socket;
			});

			socket.on('join', function(data) {
				if (!verify(['username', 'session'], data, socket, 'joinResponse'))
					return;

				if (bingo.active || bingo.finished)
					return Error(socket, 'joinResponse', 'Session already started');

				if (Object.keys(bingo.players).length >= 10)
					return Error(socket,  'joinResponse', 'Cannot accept more than 10 players');

				getUserInfo(data.username, function(err, username, id) {
					if (err) 
						return Error(socket, 'joinResponse', username);

					if (id in bingo.players)
						return Error(socket,  'joinResponse', 'User already exists in session');

					if (bingo.addPlayer(id, username)) {
						socket.custom.username = username;
						socket.custom.id = id;
						socket.emit('joinResponse', {
							err: false,
							message: `Joined ${socket.custom.username}`
						});
					}
				});
			});

			socket.on('remove', function() {
				if (bingo.removePlayer(socket.custom.id))
					delete socket.custom.id;
				socket.emit('removed');
			});
			
			socket.on('ready', function() {
				bingo.ready(socket.custom.id);
			})
			
			socket.on('unready', function() {
				bingo.unready(socket.custom.id);
			});
			
			socket.on('color', function(data) {
				bingo.changePlayerColor(socket.custom.id, data.color);
			})
			
			socket.on('start', function() {
				startTimer(3000);
			});
			
			socket.on('unstart', function() {
				// start = false;
			});

			if (bingo.active || bingo.finished) {
				socket.emit('board', self.getBoardData());
			}
			socket.emit("players", self.getPlayerData());
			return lambda(false, 'Added socket');
		};
		
		self.canStart = function(state) {
			canStart = state;
			emitAll('updateStart', state);
		};
		
		self.updateBoard = function(json) {
			emitAll('board', json);
		};
		
		self.updatePlayers = function(json) {
			emitAll('players', json);
		};
		
		self.playerFinish = function(id) {
			emitAll('playerfinish', JSON.stringify({'player': id}));
		};
		
		self.finish = function() {
			finished = true;
			emitAll('finish');
		};
		
		self.getBoardData = function() {
			return bingo.getBoardData();
		};
		
		self.getPlayerData = function() {
			return bingo.getPlayerData();
		};
		
		self.getBingoGoalOptions = function() {
			return bingo.getGoalOptions();
		};
		
		self.receiveReplay = function(r) {
			bingo.sendReplay(r);
		};
		
		self.getSessionJson = function() {
			var status = bingo.getStatus();
			status.id = self.id;
			return status;
		};

		self.endSession = function() {
			console.log("endSession", self.id);
			cleanup();
		}
		
// CTOR:

		console.log("new Session", self.id);
		extern.rooms[self.id] = self;
		setTimeout(self.endSession, 86400000);
		return self;
	}

// EXTERN

	extern.newSession = function() {
		return Reflect.construct(Session, arguments);
	}
	
	return extern;
}
module.exports = build;