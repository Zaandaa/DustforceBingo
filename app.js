var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var https = require("https");
var socket = require("socket.io");
var bodyParser = require('body-parser');

var ENVIRONMENT = process.env.ENVIRONMENT || 'prod';
var base = ENVIRONMENT == 'dev' ? '/bingo/' : '/';

var app = express();
var server = https.createServer(app);
var io = socket(server, {
	path: base + "socket.io",
	pingInterval: 5000,
	pingTimeout: 5000
});

var index = require('./routes/index');
var session = require('./routes/session')(io);
var testbingo = require('./routes/testbingo');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

console.log("Environment:", ENVIRONMENT);

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(base, express.static(path.join(__dirname, 'public')));
app.use(base + 'socket', express.static(path.join(__dirname, 'node_modules', 'socket.io-client', 'dist')));
app.use(base, index);
app.use(base + 'session', session);
app.use(base + 'testbingo', testbingo);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development

  res.locals.message = err.message;
  res.locals.error = ENVIRONMENT === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = server;
