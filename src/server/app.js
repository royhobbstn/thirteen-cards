import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path, { dirname } from 'path';
import Deck from 'card-deck';
import { orderedCards, cardRank } from '../cardUtils/cards.js';
import { getDetectedCards } from '../cardUtils/detectedCards.js';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import {
  findLowestAvailableRank,
  findHighestAvailableRank,
  resetGame,
  countRemainingPlayers,
  findOrphanedSeat,
  findSeatIndex,
  assignGamePoints,
} from './server-util.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const port = process.env.PORT || 4000;

const app = express();

app.use(express.static(path.join(__dirname, '../../build/')));

app.get('*', function (req, res) {
  res.sendFile('index.html', { root: path.join(__dirname, '../../build/') });
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
    // stats - playerGames is accumulated number of players in all games user has played
    // for instance, one 2 player game + one 4 player game = 6 playerGames
    // game score is NumberPlayers - rank + 1
    // 1st place in 2 player game (2), 3rd place in 4 player game (2) = 2 + 2 pts
    // divided by player games (4 / 6) .67 * 4 = 2.667 rank
    room.stats = {}; // by socketId { 'socketId': { points: 0, playerGames: 0, games: 0, first: 0, second: 0, third: 0, fourth: 0, bombs: 0 } }
    /*** specific below ***/
    room.rank = [null, null, null, null]; // 1,2,3,4th place
    room.seated = [null, null, null, null]; // corresponds to table position. value of null is empty, '--name' is an AI, 'kslfkjahsdf' is a socket.id
    room.cards = [null, null, null, null]; // corresponds to table position.  value of null is empty, (non-ordered... let it be uncontrolled on client)
    room.submitted = []; // [array of cards currently submitted] or [] empty array for 'pass'.
    room.last = [null, null, null, null]; // [obj, null, pass, pass], corresponds to table position, value of null is empty. obj is detected hand object
    room.initial = true; // flag to indicate no hands have been played yet.  Purpose is when to necessitate hand must be played with lowest card available.
    room.lowest = null; // lowest card dealt.  must be played in first hand of game.
    room.stage = 'seating'; // seating | game | done
    room.turnIndex = 0; // seat Index whos turn it is.
    room.startingPlayers = 0; // how many players present when game began (for ranking purposes)
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

    // officially add player and add a stat row
    roomData[roomName].players.push(socket.id);
    roomData[roomName].stats[socket.id] = {
      points: 0,
      playerGames: 0,
      games: 0,
      first: 0,
      second: 0,
      third: 0,
      fourth: 0,
      bombs: 0,
    };

    // update everyones game data (mostly for newly connected user)
    sendToEveryone(io, roomData[roomName]);

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

    sendToEveryone(io, roomData[roomName]);
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

    sendToEveryone(io, roomData[roomName]);
  });

  socket.on('setGameStatus', message => {
    const updatedStatus = message.body;
    roomData[roomName].lastModified = Date.now();

    if (updatedStatus === 'game') {
      roomData[roomName].gameId = uuid();
      // deal cards
      const myDeck = new Deck(JSON.parse(JSON.stringify(orderedCards)));
      myDeck.shuffle();

      let playerCount = 0;
      roomData[roomName].seated.forEach((seat, index) => {
        if (seat !== null) {
          playerCount++;
          roomData[roomName].cards[index] = [...myDeck.draw(13)].sort((a, b) => {
            return cardRank[b] - cardRank[a];
          });
        }
      });

      roomData[roomName].startingPlayers = playerCount;

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
            roomData[roomName].lowest = cardsAtSeat[12];
          }
        }
      }
      roomData[roomName].turnIndex = indexOfLowestRankingCardSeat;
    }

    // actually set status
    roomData[roomName].stage = updatedStatus;
    sendToEveryone(io, roomData[roomName]);
  });

  socket.on('submitHand', message => {
    roomData[roomName].lastModified = Date.now();
    roomData[roomName].initial = false;

    // todo :  if initial = true and doesnt contain lowest card
    // (shouldnt happen unless someone is tampering with calls)

    // todo: same as above, shouldnt happen, but enforce that submitted
    // cards are > rank than board cards, and are on same play path
    // ex: Singles, Pairs, etc

    const detectedHand = getDetectedCards(message.body);

    // record bombs from this
    if (detectedHand.play === 'Bomb') {
      roomData[roomName].stats[socket.id].bombs += 1;
    }

    const submittedHand = message.body.map(d => d.id);

    // populate / sort board
    roomData[roomName].board = [...submittedHand].sort((a, b) => {
      return cardRank[b] - cardRank[a];
    });

    // find which seat message came from
    const seatIndex = findSeatIndex(roomData[roomName], socket.id);

    // populate last play for seat
    roomData[roomName].last[seatIndex] = detectedHand;

    // subtract cards from hand
    roomData[roomName].cards[seatIndex] = roomData[roomName].cards[seatIndex].filter(card => {
      return !submittedHand.includes(card);
    });

    // check for win condition
    if (roomData[roomName].cards[seatIndex].length === 0) {
      const assignRank = findLowestAvailableRank(roomData[roomName]);
      roomData[roomName].rank[seatIndex] = assignRank;
      roomData[roomName].stats[socket.id].points += assignGamePoints(
        roomData[roomName],
        assignRank,
      );
      roomData[roomName].stats[socket.id].playerGames += roomData[roomName].startingPlayers;
      roomData[roomName].stats[socket.id].games += 1;
      if (assignRank === 1) {
        roomData[roomName].stats[socket.id].first += 1;
      } else if (assignRank === 2) {
        roomData[roomName].stats[socket.id].second += 1;
      } else if (assignRank === 3) {
        roomData[roomName].stats[socket.id].third += 1;
      } else if (assignRank === 4) {
        roomData[roomName].stats[socket.id].fourth += 1;
      }
    }

    const highestAvailableRank = findHighestAvailableRank(roomData[roomName]);

    const [orphanedSeatCount, orphanedSeatIndex] = findOrphanedSeat(roomData[roomName]);

    if (orphanedSeatCount === 1) {
      roomData[roomName].rank[orphanedSeatIndex] = highestAvailableRank;
      const orphanSocket = roomData[roomName].seated[orphanedSeatIndex];
      roomData[roomName].stats[orphanSocket].points += assignGamePoints(
        roomData[roomName],
        highestAvailableRank,
      );
      roomData[roomName].stats[orphanSocket].playerGames += roomData[roomName].startingPlayers;
      roomData[roomName].stats[orphanSocket].games += 1;
      if (highestAvailableRank === 1) {
        roomData[roomName].stats[orphanSocket].first += 1;
      } else if (highestAvailableRank === 2) {
        roomData[roomName].stats[orphanSocket].second += 1;
      } else if (highestAvailableRank === 3) {
        roomData[roomName].stats[orphanSocket].third += 1;
      } else if (highestAvailableRank === 4) {
        roomData[roomName].stats[orphanSocket].fourth += 1;
      }
    }

    const remainingPlayers = countRemainingPlayers(roomData[roomName]);

    if (!remainingPlayers) {
      resetGame(roomData[roomName], sendToEveryone, io);
    } else {
      roomData[roomName].turnIndex = findNextPlayersTurn(roomData[roomName]);
    }

    sendToEveryone(io, roomData[roomName]);
  });

  socket.on('passTurn', () => {
    roomData[roomName].lastModified = Date.now();
    roomData[roomName].turnIndex = findNextPlayersTurn(roomData[roomName]);

    // find which seat message came from
    const seatIndex = findSeatIndex(roomData[roomName], socket.id);

    roomData[roomName].last[seatIndex] = 'pass';

    // todo, determine if board has been passed around.
    // if so, clear cards on board and allow next player to play whatever

    sendToEveryone(io, roomData[roomName]);
  });

  socket.on('forfeit', () => {
    roomData[roomName].lastModified = Date.now();

    // find which seat message came from
    const seatIndex = findSeatIndex(roomData[roomName], socket.id);

    // find next available rank
    const highestAvailableRank = findHighestAvailableRank(roomData[roomName]);
    // assign highestAvailableRank to forfeiter
    roomData[roomName].rank[seatIndex] = highestAvailableRank;
    roomData[roomName].stats[socket.id].points += assignGamePoints(
      roomData[roomName],
      highestAvailableRank,
    );
    roomData[roomName].stats[socket.id].playerGames += roomData[roomName].startingPlayers;
    roomData[roomName].stats[socket.id].games += 1;
    if (highestAvailableRank === 1) {
      roomData[roomName].stats[socket.id].first += 1;
    } else if (highestAvailableRank === 2) {
      roomData[roomName].stats[socket.id].second += 1;
    } else if (highestAvailableRank === 3) {
      roomData[roomName].stats[socket.id].third += 1;
    } else if (highestAvailableRank === 4) {
      roomData[roomName].stats[socket.id].fourth += 1;
    }
    // see if people are still in room
    const nextHighestAvailableRank = findHighestAvailableRank(roomData[roomName]);

    const [orphanedSeatCount, orphanedSeatIndex] = findOrphanedSeat(roomData[roomName]);

    if (orphanedSeatCount === 1) {
      roomData[roomName].rank[orphanedSeatIndex] = nextHighestAvailableRank;
      // find socketId of orphan
      const orphanSocket = roomData[roomName].seated[orphanedSeatIndex];
      roomData[roomName].stats[orphanSocket].points += assignGamePoints(
        roomData[roomName],
        nextHighestAvailableRank,
      );
      roomData[roomName].stats[orphanSocket].playerGames += roomData[roomName].startingPlayers;
      roomData[roomName].stats[orphanSocket].games += 1;
      if (nextHighestAvailableRank === 1) {
        roomData[roomName].stats[orphanSocket].first += 1;
      } else if (nextHighestAvailableRank === 2) {
        roomData[roomName].stats[orphanSocket].second += 1;
      } else if (nextHighestAvailableRank === 3) {
        roomData[roomName].stats[orphanSocket].third += 1;
      } else if (nextHighestAvailableRank === 4) {
        roomData[roomName].stats[orphanSocket].fourth += 1;
      }
    }

    const remainingPlayers = countRemainingPlayers(roomData[roomName]);

    if (!remainingPlayers) {
      resetGame(roomData[roomName], sendToEveryone, io);
    } else {
      roomData[roomName].turnIndex = findNextPlayersTurn(roomData[roomName]);
    }

    sendToEveryone(io, roomData[roomName]);
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

    sendToEveryone(io, roomData[roomName]);

    socket.leave(roomName);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));

function sendToEveryone(io, data) {
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

function findNextPlayersTurn(room) {
  let nextPlayer = null;

  // find next players turn
  for (let i = 1; i <= 4; i++) {
    let seatIndex = room.turnIndex + i;
    if (seatIndex > 3) {
      seatIndex = seatIndex - 4;
    }
    // if theres someone sitting here, it's a valid seat
    if (room.seated[seatIndex]) {
      // if this person already finished and has a rank, skip
      if (room.rank[seatIndex]) {
        continue;
      }

      nextPlayer = seatIndex;
      break;
    }
  }

  if (nextPlayer === null) {
    throw new Error('could not determine next player', { data: JSON.parse(JSON.stringify(room)) });
  }

  return nextPlayer;
}
