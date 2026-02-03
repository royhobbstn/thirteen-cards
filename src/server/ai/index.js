import { analyzeHand } from './handAnalyzer.js';
import { getStrategy, getAiDelay, AI_DISPLAY_NAMES, AI_COLORS, AI_PERSONAS } from './strategies/index.js';
import { cardRank } from '../../cardUtils/cards.js';
import {
  findLowestAvailableRank,
  findHighestAvailableRank,
  findOrphanedSeat,
  assignGamePoints,
  assignRankToPlayer,
  countRemainingPlayers,
  resetGame,
  clearBoardForFreePlay,
  shouldClearBoard,
  findNextPlayersTurn,
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
  room.lastPassSeat = seatIndex;

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
  room.lastPassSeat = null; // clear pass indicator when cards are played

  // Log card play (use sorted board for consistent display)
  io.in(roomName).emit(CHAT, logCardPlay(playerName, play.detection, room.board));

  // Remove played cards from hand
  room.cards[seatIndex] = room.cards[seatIndex].filter(card => !submittedHand.includes(card));

  // Check for win condition
  if (room.cards[seatIndex].length === 0) {
    const assignRank = findLowestAvailableRank(room);
    assignRankToPlayer(room, seatIndex, assignRank);
    // Log player finish
    io.in(roomName).emit(CHAT, logFinish(playerName, assignRank));
  }

  // Check for orphaned player
  const highestAvailableRank = findHighestAvailableRank(room);
  const [orphanedSeatCount, orphanedSeatIndex] = findOrphanedSeat(room);

  if (orphanedSeatCount === 1) {
    assignRankToPlayer(room, orphanedSeatIndex, highestAvailableRank);
    // Log orphan finish (only if not disconnected)
    const orphanSocket = room.seated[orphanedSeatIndex];
    const orphanName = room.aliases[orphanSocket];
    if (orphanName) {
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
