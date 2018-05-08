var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Listening on ${ PORT }`)
});

// const path = require('path')
var dataEmitter = require('./index');
var tempCounter = 0;
var tempComments = [];
var tempSubs = [];
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

  // .use(express.static(path.join(__dirname, 'public')))
  // .set('views', path.join(__dirname, 'views'))
  // .set('view engine', 'ejs')

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
  // res.send('Working!');
});

io.on('connection', function (socket) {
  console.log('New client');
  socket.emit('updateCounter', tempCounter);
  socket.emit('updateSubs', tempSubs);
  for (comment of tempComments) {
    socket.emit('newComment', comment);
  }
});

// app.listen(PORT, () => console.log(`Listening on ${ PORT }`));
