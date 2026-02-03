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
  assignRankToPlayer,
  validateTurn,
  validateOwnsCards,
  validateInitialPlay,
  validatePlayBeatsBoard,
  shouldClearBoard,
  clearBoardForFreePlay,
  replaceSocketId,
  isAiSeat,
  getAiPersona,
  findNextPlayersTurn,
} from './server-util.js';
import {
  processAiTurn,
  AI_PERSONAS,
  AI_DISPLAY_NAMES,
  AI_COLORS,
} from './ai/index.js';
import {
  logGameStart,
  logCardPlay,
  logPass,
  logForfeit,
  logFinish,
  logBoardCleared,
} from './gameLog.js';

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
    room.lastPassSeat = null; // seat index of last player who passed (persists across board clears for UI notification)
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

  socket.on('announceConnection', ({ lastKnownSocket }) => {
    roomData[roomName].lastModified = Date.now();
    roomData[roomName].players.push(socket.id); // officially add new player

    if (lastKnownSocket && lastKnownSocket !== socket.id && lastKnownSocket !== 'null') {
      replaceSocketId(roomData[roomName], lastKnownSocket, socket.id);
    }
    // add a stat row if needed
    if (!roomData[roomName].stats[socket.id]) {
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
    }

    // update everyones game data (mostly for newly connected user)
    sendToEveryone(io, roomData[roomName]);

    // new player, say hello everyone! (only if they have a name)
    if (roomData[roomName].aliases[socket.id] && roomData[roomName].aliases[socket.id] !== 'null') {
      io.in(roomName).emit(CHAT, {
        body: `${roomData[roomName].aliases[socket.id]} has connected`,
        senderId: '', // blank here indicates moderator italic grey text in chat room
      });
    }
  });

  socket.on('updateSettings', message => {
    roomData[roomName].lastModified = Date.now();

    const oldUserName = roomData[roomName].aliases[socket.id];
    if (oldUserName !== message.userName) {
      roomData[roomName].aliases[socket.id] = message.userName;
      if (oldUserName && oldUserName !== 'null') {
        io.in(roomName).emit(CHAT, {
          body: `--${oldUserName || 'new user'}-- has changed their name to: --${
            message.userName
          }--`,
          senderId: '', // blank here indicates moderator italic grey text in chat room
        });
      } else {
        io.in(roomName).emit(CHAT, {
          body: `${message.userName} has connected`,
          senderId: '', // blank here indicates moderator italic grey text in chat room
        });
      }
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

  socket.on('addAi', message => {
    const { seatIndex, persona } = message.body;
    roomData[roomName].lastModified = Date.now();

    // Validate seat index
    if (seatIndex < 0 || seatIndex > 3) {
      console.log(`Invalid addAi: invalid seat index ${seatIndex}`);
      return;
    }

    // Validate persona
    if (!AI_PERSONAS.includes(persona)) {
      console.log(`Invalid addAi: unknown persona ${persona}`);
      return;
    }

    // Can only add AI during seating stage
    if (roomData[roomName].stage !== 'seating') {
      console.log('Invalid addAi: game already started');
      return;
    }

    // Seat must be empty
    if (roomData[roomName].seated[seatIndex] !== null) {
      console.log(`Invalid addAi: seat ${seatIndex} is occupied`);
      return;
    }

    // Add AI to seat
    const aiSeatId = `--${persona}`;
    roomData[roomName].seated[seatIndex] = aiSeatId;
    roomData[roomName].aliases[aiSeatId] = AI_DISPLAY_NAMES[persona];
    roomData[roomName].colors[aiSeatId] = AI_COLORS[persona];

    // Initialize AI stats if needed
    if (!roomData[roomName].stats[aiSeatId]) {
      roomData[roomName].stats[aiSeatId] = {
        points: 0,
        playerGames: 0,
        games: 0,
        first: 0,
        second: 0,
        third: 0,
        fourth: 0,
        bombs: 0,
      };
    }

    io.in(roomName).emit(CHAT, {
      body: `${AI_DISPLAY_NAMES[persona]} (AI) has joined the table`,
      senderId: '',
    });

    sendToEveryone(io, roomData[roomName]);
  });

  socket.on('removeAi', message => {
    const { seatIndex } = message.body;
    roomData[roomName].lastModified = Date.now();

    // Validate seat index
    if (seatIndex < 0 || seatIndex > 3) {
      console.log(`Invalid removeAi: invalid seat index ${seatIndex}`);
      return;
    }

    // Can only remove AI during seating stage
    if (roomData[roomName].stage !== 'seating') {
      console.log('Invalid removeAi: game already started');
      return;
    }

    // Seat must have an AI
    const seatId = roomData[roomName].seated[seatIndex];
    if (!isAiSeat(seatId)) {
      console.log(`Invalid removeAi: seat ${seatIndex} does not have AI`);
      return;
    }

    const persona = getAiPersona(seatId);

    // Clear the seat
    roomData[roomName].seated[seatIndex] = null;

    io.in(roomName).emit(CHAT, {
      body: `${AI_DISPLAY_NAMES[persona]} (AI) has left the table`,
      senderId: '',
    });

    sendToEveryone(io, roomData[roomName]);
  });

  socket.on('setGameStatus', message => {
    const updatedStatus = message.body;
    roomData[roomName].lastModified = Date.now();

    // Handle "Play Again" transition from 'done' to 'seating'
    if (updatedStatus === 'seating' && roomData[roomName].stage === 'done') {
      roomData[roomName].stage = 'seating';
      roomData[roomName].rank = [null, null, null, null];
      roomData[roomName].cards = [null, null, null, null];
      roomData[roomName].submitted = [];
      roomData[roomName].last = [null, null, null, null];
      roomData[roomName].initial = true;
      roomData[roomName].lowest = null;
      roomData[roomName].turnIndex = 0;
      roomData[roomName].board = [];
      roomData[roomName].gameId = 0;
      // Clean up disconnected seats
      roomData[roomName].seated = roomData[roomName].seated.map(seat =>
        seat === 'disconnected' ? null : seat,
      );
      sendToEveryone(io, roomData[roomName]);
      return;
    }

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

    // Trigger AI turn if game just started and first turn is AI
    if (updatedStatus === 'game') {
      // Log game start
      io.in(roomName).emit(CHAT, logGameStart(roomData[roomName].startingPlayers));
      processAiTurn(roomData[roomName], sendToEveryone, io, roomName);
    }
  });

  socket.on('submitHand', message => {
    roomData[roomName].lastModified = Date.now();

    // Validate message format
    if (!message || !Array.isArray(message.body)) {
      console.log(`Invalid submitHand from ${socket.id}: malformed message`);
      socket.emit('playError', { message: 'Invalid message format' });
      return;
    }

    const submittedHand = message.body.map(d => d.id);
    const seatIndex = findSeatIndex(roomData[roomName], socket.id);
    const detectedHand = getDetectedCards(message.body);

    // Validate it's this player's turn
    if (!validateTurn(roomData[roomName], socket.id)) {
      console.log(`Invalid play from ${socket.id}: not their turn`);
      socket.emit('playError', { message: "It's not your turn" });
      return;
    }

    // Validate player owns the submitted cards
    if (!validateOwnsCards(roomData[roomName], socket.id, submittedHand)) {
      console.log(`Invalid play from ${socket.id}: doesn't own submitted cards`);
      socket.emit('playError', { message: "You don't own those cards" });
      return;
    }

    // Validate initial play contains lowest card
    if (!validateInitialPlay(roomData[roomName], submittedHand)) {
      console.log(`Invalid play from ${socket.id}: initial play missing lowest card`);
      socket.emit('playError', { message: 'First play must include the lowest card' });
      return;
    }

    // Validate play beats the board
    if (!validatePlayBeatsBoard(roomData[roomName], seatIndex, detectedHand)) {
      console.log(`Invalid play from ${socket.id}: play doesn't beat board`);
      socket.emit('playError', { message: "Your play doesn't beat the board" });
      return;
    }

    roomData[roomName].initial = false;

    // record bombs from this
    if (detectedHand.play === 'Bomb') {
      roomData[roomName].stats[socket.id].bombs += 1;
    }

    // populate / sort board
    roomData[roomName].board = [...submittedHand].sort((a, b) => {
      return cardRank[b] - cardRank[a];
    });

    // populate last play for seat and reset others' pass status
    roomData[roomName].last = roomData[roomName].last.map((entry, idx) =>
      idx === seatIndex ? detectedHand : null,
    );
    roomData[roomName].lastPassSeat = null; // clear pass indicator when cards are played

    // Log card play (use sorted board for consistent display)
    const playerName = roomData[roomName].aliases[socket.id];
    io.in(roomName).emit(CHAT, logCardPlay(playerName, detectedHand, roomData[roomName].board));

    // subtract cards from hand
    roomData[roomName].cards[seatIndex] = roomData[roomName].cards[seatIndex].filter(card => {
      return !submittedHand.includes(card);
    });

    // check for win condition
    if (roomData[roomName].cards[seatIndex].length === 0) {
      const assignRank = findLowestAvailableRank(roomData[roomName]);
      assignRankToPlayer(roomData[roomName], seatIndex, assignRank);
      // Log player finish
      io.in(roomName).emit(CHAT, logFinish(playerName, assignRank));
    }

    const highestAvailableRank = findHighestAvailableRank(roomData[roomName]);

    const [orphanedSeatCount, orphanedSeatIndex] = findOrphanedSeat(roomData[roomName]);

    if (orphanedSeatCount === 1) {
      assignRankToPlayer(roomData[roomName], orphanedSeatIndex, highestAvailableRank);
      // Log orphan finish (only if not disconnected)
      const orphanSocket = roomData[roomName].seated[orphanedSeatIndex];
      const orphanName = roomData[roomName].aliases[orphanSocket];
      if (orphanName) {
        io.in(roomName).emit(CHAT, logFinish(orphanName, highestAvailableRank));
      }
    }

    const remainingPlayers = countRemainingPlayers(roomData[roomName]);

    if (!remainingPlayers) {
      resetGame(roomData[roomName], sendToEveryone, io);
    } else {
      roomData[roomName].turnIndex = findNextPlayersTurn(roomData[roomName]);
    }

    sendToEveryone(io, roomData[roomName]);

    // Trigger AI turn if next player is AI
    if (remainingPlayers) {
      processAiTurn(roomData[roomName], sendToEveryone, io, roomName);
    }
  });

  socket.on('passTurn', () => {
    roomData[roomName].lastModified = Date.now();

    // find which seat message came from
    const seatIndex = findSeatIndex(roomData[roomName], socket.id);

    roomData[roomName].last[seatIndex] = 'pass';
    roomData[roomName].lastPassSeat = seatIndex;

    // Log pass
    const playerName = roomData[roomName].aliases[socket.id];
    io.in(roomName).emit(CHAT, logPass(playerName));

    // Check if board should be cleared (all other players have passed)
    if (shouldClearBoard(roomData[roomName])) {
      clearBoardForFreePlay(roomData[roomName]);
      io.in(roomName).emit(CHAT, logBoardCleared());
    }

    roomData[roomName].turnIndex = findNextPlayersTurn(roomData[roomName]);

    sendToEveryone(io, roomData[roomName]);

    // Trigger AI turn if next player is AI
    processAiTurn(roomData[roomName], sendToEveryone, io, roomName);
  });

  socket.on('forfeit', () => {
    roomData[roomName].lastModified = Date.now();

    // find which seat message came from
    const seatIndex = findSeatIndex(roomData[roomName], socket.id);

    // Log forfeit
    const playerName = roomData[roomName].aliases[socket.id];
    io.in(roomName).emit(CHAT, logForfeit(playerName));

    // find next available rank
    const highestAvailableRank = findHighestAvailableRank(roomData[roomName]);
    // assign highestAvailableRank to forfeiter
    assignRankToPlayer(roomData[roomName], seatIndex, highestAvailableRank);

    // see if people are still in room
    const nextHighestAvailableRank = findHighestAvailableRank(roomData[roomName]);

    const [orphanedSeatCount, orphanedSeatIndex] = findOrphanedSeat(roomData[roomName]);

    if (orphanedSeatCount === 1) {
      assignRankToPlayer(roomData[roomName], orphanedSeatIndex, nextHighestAvailableRank);
      // Log orphan finish (only if not disconnected)
      const orphanSocket = roomData[roomName].seated[orphanedSeatIndex];
      const orphanName = roomData[roomName].aliases[orphanSocket];
      if (orphanName) {
        io.in(roomName).emit(CHAT, logFinish(orphanName, nextHighestAvailableRank));
      }
    }

    const remainingPlayers = countRemainingPlayers(roomData[roomName]);

    if (!remainingPlayers) {
      resetGame(roomData[roomName], sendToEveryone, io);
    } else {
      roomData[roomName].turnIndex = findNextPlayersTurn(roomData[roomName]);
    }

    sendToEveryone(io, roomData[roomName]);

    // Trigger AI turn if next player is AI
    if (remainingPlayers) {
      processAiTurn(roomData[roomName], sendToEveryone, io, roomName);
    }
  });

  /* end game specific messages */

  // Leave the room if the user closes the socket
  socket.on('disconnect', () => {
    // Guard: room may have been cleaned up already
    if (!roomData[roomName]) {
      console.log(`Client ${socket.id} disconnected (room ${roomName} no longer exists)`);
      return;
    }

    roomData[roomName].lastModified = Date.now();

    console.log(`Client ${socket.id} disconnected`);
    roomData[roomName].players = roomData[roomName].players.filter(d => d !== socket.id);

    roomData[roomName].seated = roomData[roomName].seated.map(seat => {
      if (seat === socket.id) {
        if (roomData[roomName].stage === 'seating' || roomData[roomName].stage === 'done') {
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
    // Skip AI players (they have no socket)
    if (isAiSeat(player)) continue;

    // copy this structure or else we're in a world of trouble
    const copy = JSON.parse(JSON.stringify(data));

    for (let [index, cards] of Object.entries(copy.cards)) {
      if (cards === null) {
        continue;
      }
      if (player !== copy.seated[index]) {
        copy.cards[index] = cards.map(() => 'Card');
      }
    }

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
