import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import Deck from 'card-deck';
import { orderedCards, cardRank } from '../cardUtils/cards.js';

const port = process.env.PORT || 4000;

const app = express();

app.use(express.static('build'));

app.get('*', function (req, res) {
  res.sendFile('index.html', { root: path.join(__dirname, '../build/') });
});

const server = createServer(app);
const io = new Server(server);

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
    /*** specific below ***/
    room.seated = [null, null, null, null]; // corresponds to table position. value of null is empty, '--name' is an AI, 'kslfkjahsdf' is a socket.id
    room.cards = [null, null, null, null]; // corresponds to table position.  value of null is empty, (non-ordered... let it be uncontrolled on client)
    room.submitted = []; // [array of cards currently submitted] or [] empty array for 'pass'.
    room.last = ['pass', null, 'pass', 'pass']; // [arr, null, pass, pass], corresponds to table position, value of null is empty.
    room.stage = 'seating'; // seating | game | done
    room.turnIndex = 0; // seat Index whos turn it is.
    room.board = []; // array of cards currently on the board
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

  /* game specific messages */

  socket.on('chooseSeat', message => {
    const clickedSeatIndex = message.body;

    roomData[roomName].lastModified = Date.now();

    // if already at a previous seat, remove
    // also; since Stand Up button routes here, if clickedSeatIndex is same, set flag
    let dontSit = false;
    roomData[roomName].seated = roomData[roomName].seated.map((seat, seatIndex) => {
      if (seat === socket.id) {
        if (clickedSeatIndex === seatIndex) {
          dontSit = true;
        }
        return null;
      }
      return seat;
    });

    // actually sit
    if (!dontSit) {
      if (roomData[roomName]) roomData[roomName].seated[clickedSeatIndex] = socket.id;
    }

    sendToEveryone(io, roomName, roomData[roomName]);
  });

  socket.on('setGameStatus', message => {
    const updatedStatus = message.body;
    roomData[roomName].lastModified = Date.now();

    if (updatedStatus === 'game') {
      // deal cards
      const myDeck = new Deck(orderedCards);
      myDeck.shuffle();

      roomData[roomName].seated.forEach((seat, index) => {
        if (seat !== null) {
          roomData[roomName].cards[index] = [...myDeck.draw(13)].sort((a, b) => {
            return cardRank[b] - cardRank[a];
          });
        }
      });

      // determine who's turn it is.
      // take a look at last card for every player, whoever has lowest is assigned Turn

      let lowestRankingCard = 53;
      let indexOfLowestRankingCardSeat = null;
      for (let i = 0; i < roomData[roomName].cards.length; i++) {
        const cardsAtSeat = roomData[roomName].cards[i];
        if (cardsAtSeat !== null) {
          if (cardRank[cardsAtSeat[12]] < lowestRankingCard) {
            indexOfLowestRankingCardSeat = i;
            lowestRankingCard = cardRank[cardsAtSeat[12]];
          }
        }
      }
      roomData[roomName].turnIndex = indexOfLowestRankingCardSeat;
    }

    // actually set status
    roomData[roomName].stage = updatedStatus;
    sendToEveryone(io, roomName, roomData[roomName]);
  });

  socket.on('leaveGame', () => {
    roomData[roomName].lastModified = Date.now();

    roomData[roomName].seated = roomData[roomName].seated.map(seat => {
      if (seat === socket.id) {
        return null;
      }
      return seat;
    });

    sendToEveryone(io, roomName, roomData[roomName]);
  });

  /* end game specific messages */

  // Leave the room if the user closes the socket
  socket.on('disconnect', () => {
    roomData[roomName].lastModified = Date.now();

    console.log(`Client ${socket.id} disconnected`);
    roomData[roomName].players = roomData[roomName].players.filter(d => d !== socket.id);

    roomData[roomName].seated = roomData[roomName].seated.map(seat => {
      if (seat === socket.id) {
        if (roomData[roomName].stage === 'seating' || roomData[roomName] === 'done') {
          return null;
        }
        // for when stage === 'game':
        return 'disconnected';
      } else {
        return seat;
      }
    });

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
