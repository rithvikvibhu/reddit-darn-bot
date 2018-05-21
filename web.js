var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Listening on ${ PORT }`)
});

var dataEmitter = require('./index');
var tempCounter = 0;
var tempComments = [];
var tempSubs = [];
var tempStats = {};
var tempGBBB = {};
dataEmitter.on('GBBB', (res) => {
  tempGBBB = res;
  console.log('New GBBB', res);
  io.sockets.emit('GBBB', res);
});
dataEmitter.on('newStats', (stats) => {
  tempStats = stats;
  io.sockets.emit('newStats', stats);
});
dataEmitter.on('updateCounter', (count) => {
  tempCounter = count;
  io.sockets.emit('updateCounter', count);
});
dataEmitter.on('updateSubs', (subs) => {
  tempSubs = subs;
  io.sockets.emit('updateSubs', subs);
});
dataEmitter.on('newComment', (comment) => {
  tempComments.push(comment);
  if (tempComments.length > 5) {
    tempComments.shift();
  }
  io.sockets.emit('newComment', comment);
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});
app.get('/stats', (req, res) => {
  res.sendFile(__dirname + '/stats.html');
});

io.on('connection', function (socket) {
  console.log('New client');
  socket.emit('newStats', tempStats);
  socket.emit('GBBB', tempGBBB);
  socket.emit('updateCounter', tempCounter);
  socket.emit('updateSubs', tempSubs);
  for (comment of tempComments) {
    socket.emit('newComment', comment);
  }
});
