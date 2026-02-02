import { analyzeHand } from './handAnalyzer.js';
import { getStrategy, getAiDelay, AI_DISPLAY_NAMES, AI_COLORS, AI_PERSONAS } from './strategies/index.js';
import { cardRank } from '../../cardUtils/cards.js';
import {
  findLowestAvailableRank,
  findHighestAvailableRank,
  findOrphanedSeat,
  assignGamePoints,
  countRemainingPlayers,
  resetGame,
  clearBoardForFreePlay,
  shouldClearBoard,
} from '../server-util.js';
import {
  logCardPlay,
  logPass,
  logFinish,
  logBoardCleared,
} from '../gameLog.js';

// Re-export constants for use elsewhere
export { AI_PERSONAS, AI_DISPLAY_NAMES, AI_COLORS };

/**
 * Check if a seat ID represents an AI player
 * @param {string} seatId - Seat ID from room.seated[]
 * @returns {boolean}
 */
export function isAiSeat(seatId) {
  return typeof seatId === 'string' && seatId.startsWith('--');
}

/**
 * Get the AI persona from a seat ID
 * @param {string} seatId - Seat ID like '--marcus'
 * @returns {string} Persona name like 'marcus'
 */
export function getAiPersona(seatId) {
  if (!isAiSeat(seatId)) return null;
  return seatId.slice(2);
}

/**
 * Process AI turn if current player is an AI
 * Called after turn transitions in app.js
 *
 * @param {object} room - Room state
 * @param {function} sendToEveryone - Broadcast function
 * @param {object} io - Socket.io instance
 * @param {string} roomName - Room name for broadcasts
 */
export function processAiTurn(room, sendToEveryone, io, roomName) {
  // Check if game is still active
  if (room.stage !== 'game') return;

  const currentTurnIndex = room.turnIndex;
  const currentSeatId = room.seated[currentTurnIndex];

  // Check if current turn is AI
  if (!isAiSeat(currentSeatId)) return;

  const persona = getAiPersona(currentSeatId);
  const delay = getAiDelay(persona);

  // Execute AI turn after delay
  // Capture currentTurnIndex to ensure we execute for the correct turn
  setTimeout(() => {
    executeAiTurn(room, currentTurnIndex, sendToEveryone, io, roomName);
  }, delay);
}

/**
 * Execute an AI player's turn
 */
function executeAiTurn(room, seatIndex, sendToEveryone, io, roomName) {
  // Guard: check game state hasn't changed
  if (room.stage !== 'game') return;
  if (room.turnIndex !== seatIndex) return;

  const seatId = room.seated[seatIndex];
  if (!isAiSeat(seatId)) return;

  const persona = getAiPersona(seatId);
  const strategy = getStrategy(persona);
  const hand = room.cards[seatIndex];

  if (!hand || hand.length === 0) return;

  // Analyze hand and get valid plays
  const analysis = analyzeHand(hand, room, seatIndex);

  // Let strategy choose a play (or pass)
  const chosenPlay = strategy.choosePlay(analysis, room, seatIndex);

  if (chosenPlay === null) {
    // AI passes
    executeAiPass(room, seatIndex, sendToEveryone, io, roomName);
  } else {
    // AI plays cards
    executeAiPlay(room, seatIndex, chosenPlay, sendToEveryone, io, roomName);
  }
}

/**
 * Execute AI pass action
 */
function executeAiPass(room, seatIndex, sendToEveryone, io, roomName) {
  const seatId = room.seated[seatIndex];
  const CHAT = 'newChatMessage';

  // Record pass
  room.last[seatIndex] = 'pass';

  // Log pass
  const playerName = room.aliases[seatId];
  io.in(roomName).emit(CHAT, logPass(playerName));

  // Check if board should be cleared
  if (shouldClearBoard(room)) {
    clearBoardForFreePlay(room);
    io.in(roomName).emit(CHAT, logBoardCleared());
  }

  // Advance turn
  room.turnIndex = findNextPlayersTurn(room);

  // Broadcast update
  sendToEveryone(io, room);

  // Process next AI turn if needed
  processAiTurn(room, sendToEveryone, io, roomName);
}

/**
 * Execute AI play action
 */
function executeAiPlay(room, seatIndex, play, sendToEveryone, io, roomName) {
  const seatId = room.seated[seatIndex];
  const submittedHand = play.cards;
  const CHAT = 'newChatMessage';
  const playerName = room.aliases[seatId];

  // Clear initial flag
  room.initial = false;

  // Record bombs for stats
  if (play.detection.play === 'Bomb') {
    if (room.stats[seatId]) {
      room.stats[seatId].bombs += 1;
    }
  }

  // Update board
  room.board = [...submittedHand].sort((a, b) => cardRank[b] - cardRank[a]);

  // Record last play for seat and reset others' pass status
  room.last = room.last.map((entry, idx) => (idx === seatIndex ? play.detection : null));

  // Log card play (use sorted board for consistent display)
  io.in(roomName).emit(CHAT, logCardPlay(playerName, play.detection, room.board));

  // Remove played cards from hand
  room.cards[seatIndex] = room.cards[seatIndex].filter(card => !submittedHand.includes(card));

  // Check for win condition
  if (room.cards[seatIndex].length === 0) {
    const assignRank = findLowestAvailableRank(room);
    room.rank[seatIndex] = assignRank;

    // Update AI stats
    if (room.stats[seatId]) {
      room.stats[seatId].points += assignGamePoints(room, assignRank);
      room.stats[seatId].playerGames += room.startingPlayers;
      room.stats[seatId].games += 1;
      if (assignRank === 1) room.stats[seatId].first += 1;
      else if (assignRank === 2) room.stats[seatId].second += 1;
      else if (assignRank === 3) room.stats[seatId].third += 1;
      else if (assignRank === 4) room.stats[seatId].fourth += 1;
    }
    // Log player finish
    io.in(roomName).emit(CHAT, logFinish(playerName, assignRank));
  }

  // Check for orphaned player
  const highestAvailableRank = findHighestAvailableRank(room);
  const [orphanedSeatCount, orphanedSeatIndex] = findOrphanedSeat(room);

  if (orphanedSeatCount === 1) {
    room.rank[orphanedSeatIndex] = highestAvailableRank;
    const orphanSocket = room.seated[orphanedSeatIndex];

    if (room.stats[orphanSocket]) {
      room.stats[orphanSocket].points += assignGamePoints(room, highestAvailableRank);
      room.stats[orphanSocket].playerGames += room.startingPlayers;
      room.stats[orphanSocket].games += 1;
      if (highestAvailableRank === 1) room.stats[orphanSocket].first += 1;
      else if (highestAvailableRank === 2) room.stats[orphanSocket].second += 1;
      else if (highestAvailableRank === 3) room.stats[orphanSocket].third += 1;
      else if (highestAvailableRank === 4) room.stats[orphanSocket].fourth += 1;
      // Log orphan finish (only if not disconnected)
      const orphanName = room.aliases[orphanSocket];
      io.in(roomName).emit(CHAT, logFinish(orphanName, highestAvailableRank));
    }
  }

  // Check if game is over
  const remainingPlayers = countRemainingPlayers(room);

  if (!remainingPlayers) {
    resetGame(room, sendToEveryone, io);
    sendToEveryone(io, room);
    return;
  }

  // Advance turn
  room.turnIndex = findNextPlayersTurn(room);

  // Broadcast update
  sendToEveryone(io, room);

  // Process next AI turn if needed
  processAiTurn(room, sendToEveryone, io, roomName);
}

/**
 * Find next player's turn (copied from app.js to avoid circular import)
 */
function findNextPlayersTurn(room) {
  let nextPlayer = null;

  for (let i = 1; i <= 4; i++) {
    let seatIndex = room.turnIndex + i;
    if (seatIndex > 3) {
      seatIndex = seatIndex - 4;
    }
    if (room.seated[seatIndex]) {
      if (room.rank[seatIndex]) {
        continue;
      }
      nextPlayer = seatIndex;
      break;
    }
  }

  if (nextPlayer === null) {
    throw new Error('could not determine next player');
  }

  return nextPlayer;
}
