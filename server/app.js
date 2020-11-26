const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const port = process.env.PORT || 4000;

const app = express();

app.use(express.static('build'));

app.get('*', function (req, res) {
  res.sendFile('index.html', { root: path.join(__dirname, '../build/') });
});

const server = http.createServer(app);
const io = socketIo(server);

const roomData = {};
cleanUpRoomData();

const CHAT = 'newChatMessage';

io.on('connection', socket => {
  console.log(`Client ${socket.id} connected`);

  // alias only used once, because it is changeable
  const { roomName, userName, colorChoice } = socket.handshake.query;
  socket.join(roomName);

  // if room doesn't exist.  set it up.
  if (!roomData[roomName]) {
    roomData[roomName] = {};
    const room = roomData[roomName];
    room.lastModified = Date.now(); // unix timestamp
    room.aliases = {}; // { socketId: alias }
    room.colors = {}; // {socketId: #hex },
    room.players = []; // array of socketIds
  }

  // initial setup for a newly connected player
  roomData[roomName].aliases[socket.id] = userName;
  roomData[roomName].colors[socket.id] = colorChoice;

  // Listen for new messages
  socket.on(CHAT, message => {
    roomData[roomName].lastModified = Date.now();
    io.in(roomName).emit(CHAT, message);
  });

  socket.on('announceConnection', () => {
    roomData[roomName].lastModified = Date.now();

    // officially add player
    roomData[roomName].players.push(socket.id);

    // update everyones game data (mostly for newly connected user)
    sendToEveryone(io, roomName, roomData[roomName]);

    // new player, say hello everyone!
    io.in(roomName).emit(CHAT, {
      body: `${roomData[roomName].aliases[socket.id] || '--new user--'} has connected`,
      senderId: '', // blank here indicates moderator italic grey text in chat room
    });
  });

  socket.on('updateSettings', message => {
    roomData[roomName].lastModified = Date.now();

    const oldUserName = roomData[roomName].aliases[socket.id];
    if (oldUserName !== message.userName) {
      roomData[roomName].aliases[socket.id] = message.userName;
      io.in(roomName).emit(CHAT, {
        body: `--${oldUserName || 'new user'}-- has changed their name to: --${message.userName}--`,
        senderId: '', // blank here indicates moderator italic grey text in chat room
      });
    }

    roomData[roomName].colors[socket.id] = message.colorChoice;

    sendToEveryone(io, roomName, roomData[roomName]);
  });

  // Leave the room if the user closes the socket
  socket.on('disconnect', () => {
    roomData[roomName].lastModified = Date.now();

    console.log(`Client ${socket.id} disconnected`);
    roomData[roomName].players = roomData[roomName].players.filter(d => d !== socket.id);

    io.in(roomName).emit(CHAT, {
      body: `${roomData[roomName].aliases[socket.id]} has disconnected`,
      senderId: '', // blank here indicates moderator italic grey text in chat room
    });

    sendToEveryone(io, roomName, roomData[roomName]);

    socket.leave(roomName);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));

function sendToEveryone(io, roomName, data) {
  // obscure cards so they cant peek at network tab traffic
  for (let player of data.players) {
    // copy this structure or else we're in a world of trouble
    const copy = JSON.parse(JSON.stringify(data));

    // TODO hide cards of other people
    io.to(player).emit('gameData', copy);
  }
}

function cleanUpRoomData() {
  // every 5 minutes, clean up all sessions older than an hour
  setInterval(() => {
    for (let roomKey of Object.keys(roomData)) {
      const time = Date.now();
      const elapsed = time - roomData[roomKey].lastModified;
      if (elapsed > 3600000) {
        delete roomData[roomKey];
      }
    }
  }, 300000);
}
