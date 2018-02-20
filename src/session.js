var request = require("request");
var socket = require("socket.io");
var querystring = require('querystring')
var seedrandom = require('seedrandom');
var iconv = require('iconv-lite');
var Bingo = require("./bingo");
var replays = require("./replays");
var util = require("./utils");

function build(io) {
	var extern = {};
	
/*
 * Connections
 */

 
// INTERNAL:

	extern.rooms = {};
 
	replays(function(r) {
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
	
	function requestWrapper(url, lambda, callback) {
		request.get({
			uri:url,
			encoding:null
		},function(error, response, body) {
			if (error || response == undefined ) {
				return lambda(true, false, '<strong>Hitbox server error</strong> Hitbox appears to be down');
			}
			
			body = iconv.decode(body, 'iso-8859-1');
			
			var json;
			try {
				json = JSON.parse(body); // replace the BOM (\uFEFF) if it exists
			} catch(e) {
				return lambda(true, false, '<strong>Something went wrong :(</strong> I bet it was TMC\'s fault.');
			}
			
			callback(json);
		});
	}
	
	function getUserJson(name, lambda, success) {
		var number = parseInt(name) 
		
		var url = 'http://proxy.dustkid.com/backend6/userSearch.php?' + querystring.stringify({
			'q':name,
			'max':50,
		});
		
		console.log(url);
		
		requestWrapper(url, lambda, function(json) {
			if (json.length == 0) {
				if (isNaN(number)) 
					return lambda(true, false, `<strong>User ${name} not found!</strong>`);
				var url = 'http://proxy.dustkid.com/backend6/userSearch.php?' + querystring.stringify({
					'userid':name
				});
				requestWrapper(url, lambda, function(json) {
					if (json.length == 0) 
						return lambda(true, false, `<strong>Username or id ${name} not found!</strong>`);
					
					return success(json)
				});
			} else {
				return success(json)
			}
		});
	}

	function getUserInfo(name, lambda) {
		getUserJson(name, lambda, function(json) {
			if(json.length > 1) {
				return lambda(false, true, json);
			}
			
			var user = json[0];
			if (user === undefined) {
				return lambda(true, false, '<strong>Internal server error</strong> Please contact @TMC or @Zaandaa they\'re dumb');
			}
			
			if (!("name" in user) || !("id" in user)) {
				return lambda(true, false, '<strong>Hitbox server error</strong> Hitbox appears to be down');
			}	
			
			lambda(false, false, user.name, user.id);
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
		self.error = bingo.error;
		if (self.error != "")
			return;

		function isPlayer(socket) {
			return socket !== undefined && socket.custom !== undefined && socket.custom.id !== undefined && socket.custom.id in bingo.players
		}
		
		function emitAll(res, mes) {
			for (id in sockets) {
				sockets[id].emit(res, mes);
			}
		}
		
		function emitPlayers(res, mes) {
			for (id in sockets) {
				if (isPlayer(sockets[id]))
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
		
		self.addSocket = function (socket, lambda) {
			sockets.push(socket);
			
			socket.safeOn = function(signal, func) {
				socket.on(signal, function(data) {
					try {
						func(data)
					} catch(e) {
						console.error("Exception thrown on", signal + ":");
						console.error(e);
						socket.emit('internalError');
					}
				});
			}
			
			socket.safeOn('disconnect', function() {
				if (isPlayer(socket) && !start)
					bingo.removePlayer(socket.custom.id);
				sockets.splice(sockets.indexOf(socket), 1);
				socket.disconnect(0);
				delete socket;
			});

			socket.safeOn('join', function(data) {
				if (!verify(['username', 'session'], data, socket, 'joinResponse'))
					return;
				if (data.username == "")
					return Error(socket,  'joinResponse', 'Username/id required');

				if (bingo.active || bingo.finished)
					return Error(socket, 'joinResponse', 'Session already started');

				if (Object.keys(bingo.players).length >= 10)
					return Error(socket,  'joinResponse', 'Cannot accept more than 10 players');

				getUserInfo(data.username, function(err, multi, data, id) {
					if (err) 
						return Error(socket, 'joinResponse', data);

					if (multi) {
						socket.emit('multiple', data);
						socket.custom.multiple = {}
						data.forEach(function(player) {
							socket.custom.multiple[player.id] = player;
						})
						return;
					}
						
					if (id in bingo.players)
						return Error(socket,  'joinResponse', 'User already exists in session');

					if (bingo.addPlayer(id, data)) {
						socket.custom.username = data;
						socket.custom.id = id;
						socket.emit('joinResponse', {
							err: false,
							message: `Joined ${socket.custom.username}`,
							username: socket.custom.username,
							id: socket.custom.id
						});
					}
				});
			});

			socket.safeOn('multichoose', function(id) {
				if(!(id in socket.custom.multiple)) {
					Error(socket, 'multiResponse', '<strong>Invalid operation!</strong> Ignoring input.');
				}
				
				if (bingo.addPlayer(id, socket.custom.multiple[id].name)) {
					socket.custom.username = socket.custom.multiple[id].name;
					socket.custom.id = id;
					socket.emit('joinResponse', {
						err: false,
						message: `Joined ${socket.custom.username}`
					});
				}
			});
			
			socket.safeOn('remove', function() {
				if (isPlayer(socket) && bingo.removePlayer(socket.custom.id))
					delete socket.custom.id;
				socket.emit('removed');
			});
			
			socket.safeOn('ready', function() {
				if (!isPlayer(socket))
					return;
				bingo.ready(socket.custom.id);
			})
			
			socket.safeOn('unready', function() {
				if (!isPlayer(socket))
					return;
				bingo.unready(socket.custom.id);
			});
			
			socket.safeOn('voteReset', function() {
				bingo.voteReset(socket.custom.id);
			});
			
			socket.safeOn('color', function(data) {
				if (!isPlayer(socket))
					return;
				bingo.changePlayerColor(socket.custom.id, data.color);
			})
			
			socket.safeOn('assign', function(data) {
				console.log('got assignment', data);
				if (!isPlayer(socket))
					return;
				bingo.assignAnti(socket.custom.id, data);
			});
			
			socket.safeOn('start', function() {
				if (!isPlayer(socket))
					return;
				startTimer(3000);
			});
			
			socket.safeOn('unstart', function() {
				// start = false;
			});

			if (bingo.active || bingo.finished) {
				socket.emit('board', self.getBoardData(socket));
			}
			socket.emit("players", self.getPlayerData());
			return lambda(false, 'Added socket');
		};
		
		self.canStart = function(state) {
			canStart = state;
			emitPlayers('updateStart', state);
		};
		
		self.removedPlayerOnStart = function(p) {
			for (id in sockets) {
				if (sockets[id].custom !== undefined && sockets[id].custom.id !== undefined && sockets[id].custom.id == p) {
					delete sockets[id].custom.id;
					break;
				}
			}
		};
		
		self.updateBoard = function() {
			for (id in sockets) {
				var bd = JSON.parse(self.getBoardData(sockets[id]));
				sockets[id].emit('board', JSON.stringify(bd));
			}
		};
		
		self.updatePlayers = function() {
			emitAll('players', self.getPlayerData());
		};
		
		self.updateLastReplay = function(lr) {
			emitAll('replay', JSON.stringify({lastReplay: lr}));
		};
		
		self.updateLog = function(log) {
			if (bingo.isWon)
				emitAll('log', JSON.stringify(log));
		};
		
		self.playerFinish = function(id) {
			// emitAll('playerfinish', JSON.stringify({'player': id}));
		};
		
		self.finish = function() {
			finished = true;
			emitAll('finish');
		};
		
		self.resetBingo = function() {
			emitAll('reset');
			start = false;
			canStart = false;
			finished = false;

			// remove players without sockets (avoids blocked rejoin)
			var playersToRemove = [];
			for (var p in bingo.players) {
				var playerExists = false;
				for (id in sockets) {
					if (isPlayer(sockets[id]) && sockets[id].custom.id == p) {
						playerExists = true;
						break;
					}
				}
				if (!playerExists)
					playersToRemove.push(p);
			}
			for (var p in playersToRemove) {
				bingo.removePlayer(p);
			}
		};
		
		self.getBoardData = function(socket) {
			var isP = isPlayer(socket)
			data = bingo.getBoardData(isP ? socket.custom.id : undefined);
			data.isPlayer = isP;
			return JSON.stringify(data);
		};
		
		self.getPlayerData = function() {
			return JSON.stringify(bingo.getPlayerData());
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