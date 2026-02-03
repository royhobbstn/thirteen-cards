/**
 * Play Handler
 * Functions for processing card plays and game state transitions
 */

import { cardRank } from '../cardUtils/cards.js';
import {
  findLowestAvailableRank,
  findHighestAvailableRank,
  findOrphanedSeat,
  assignRankToPlayer,
  countRemainingPlayers,
} from './server-util.js';

/**
 * Process a card play and update room state
 * @param {object} room - Room state
 * @param {number} seatIndex - Player's seat index
 * @param {string[]} cards - Cards being played
 * @param {object} detection - Detected hand type
 * @returns {object} Updated room state
 */
export function processCardPlay(room, seatIndex, cards, detection) {
  // Clear initial flag
  const newRoom = {
    ...room,
    initial: false,
  };

  // Update board with sorted cards
  newRoom.board = [...cards].sort((a, b) => cardRank[b] - cardRank[a]);

  // Record last play for seat and reset others' pass status
  newRoom.last = newRoom.last.map((entry, idx) => (idx === seatIndex ? detection : null));
  newRoom.lastPassSeat = null;

  // Remove played cards from hand
  newRoom.cards = [...newRoom.cards];
  newRoom.cards[seatIndex] = newRoom.cards[seatIndex].filter(card => !cards.includes(card));

  return newRoom;
}

/**
 * Check if a player has won (no cards left)
 * @param {object} room - Room state
 * @param {number} seatIndex - Player's seat index
 * @returns {boolean} True if player has won
 */
export function checkWinCondition(room, seatIndex) {
  return room.cards[seatIndex] && room.cards[seatIndex].length === 0;
}

/**
 * Handle win condition - assign rank to winner
 * @param {object} room - Room state
 * @param {number} seatIndex - Winner's seat index
 * @returns {number} Rank assigned
 */
export function handleWin(room, seatIndex) {
  const rank = findLowestAvailableRank(room);
  assignRankToPlayer(room, seatIndex, rank);
  return rank;
}

/**
 * Handle orphaned player (last remaining player gets final rank)
 * @param {object} room - Room state
 * @returns {object|null} { seatIndex, rank } if orphan found, null otherwise
 */
export function handleOrphanedPlayer(room) {
  const [orphanedCount, orphanedSeatIndex] = findOrphanedSeat(room);

  if (orphanedCount === 1) {
    const highestRank = findHighestAvailableRank(room);
    assignRankToPlayer(room, orphanedSeatIndex, highestRank);
    return { seatIndex: orphanedSeatIndex, rank: highestRank };
  }

  return null;
}

/**
 * Check if game is over (no remaining players)
 * @param {object} room - Room state
 * @returns {boolean} True if game is over
 */
export function isGameOver(room) {
  return countRemainingPlayers(room) === 0;
}

/**
 * Record bomb usage in stats
 * @param {object} room - Room state
 * @param {string} socketId - Player's socket ID
 * @param {object} detection - Detected hand type
 */
export function recordBombIfApplicable(room, socketId, detection) {
  if (detection.play === 'Bomb' && room.stats[socketId]) {
    room.stats[socketId].bombs += 1;
  }
}
