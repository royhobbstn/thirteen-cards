/**
 * Game Log Utilities
 * Formats and creates log messages for game events
 */

// Suit symbols for display
const SUIT_SYMBOLS = {
  c: '♣',
  d: '♦',
  h: '♥',
  s: '♠',
};

/**
 * Convert a card code to display format with suit symbol
 * @param {string} cardCode - Card code like "7d" or "10h"
 * @returns {string} Formatted card like "7♦" or "10♥"
 */
export function formatCard(cardCode) {
  const suit = cardCode.slice(-1);
  const rank = cardCode.slice(0, -1);
  return rank + (SUIT_SYMBOLS[suit] || suit);
}

/**
 * Format an array of cards for display
 * @param {string[]} cards - Array of card codes
 * @returns {string} Formatted cards like "7♥ 7♠"
 */
export function formatCards(cards) {
  return cards.map(formatCard).join(' ');
}

/**
 * Create a game log message object
 * @param {string} body - Message text
 * @returns {object} Message object with type: 'gamelog'
 */
export function createLogMessage(body) {
  return {
    body,
    senderId: '',
    type: 'gamelog',
  };
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, 4th)
 * @param {number} n - Number
 * @returns {string} Number with ordinal suffix
 */
function getOrdinal(n) {
  const suffixes = { 1: 'st', 2: 'nd', 3: 'rd', 4: 'th' };
  return n + (suffixes[n] || 'th');
}

/**
 * Create game start log message
 * @param {number} playerCount - Number of players
 * @returns {object} Log message
 */
export function logGameStart(playerCount) {
  return createLogMessage(`Game started with ${playerCount} players`);
}

/**
 * Create card play log message
 * @param {string} playerName - Player's display name
 * @param {object} detection - Detected hand object with play and name properties
 * @param {string[]} cards - Array of card codes played
 * @returns {object} Log message
 */
export function logCardPlay(playerName, detection, cards) {
  const playType = detection.play;
  const playName = detection.name;
  const formattedCards = formatCards(cards);

  // Use the play name which includes the hand description
  return createLogMessage(`${playerName} played ${playName} (${formattedCards})`);
}

/**
 * Create pass log message
 * @param {string} playerName - Player's display name
 * @returns {object} Log message
 */
export function logPass(playerName) {
  return createLogMessage(`${playerName} passed`);
}

/**
 * Create forfeit log message
 * @param {string} playerName - Player's display name
 * @returns {object} Log message
 */
export function logForfeit(playerName) {
  return createLogMessage(`${playerName} forfeited`);
}

/**
 * Create player finish log message
 * @param {string} playerName - Player's display name
 * @param {number} rank - Finishing position (1-4)
 * @returns {object} Log message
 */
export function logFinish(playerName, rank) {
  return createLogMessage(`${playerName} finished in ${getOrdinal(rank)} place!`);
}

/**
 * Create board cleared log message
 * @returns {object} Log message
 */
export function logBoardCleared() {
  return createLogMessage('All passed - board cleared');
}
