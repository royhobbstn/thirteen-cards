import { cardRank } from '../../cardUtils/cards.js';

// Card values for scoring plays
// 3=1, 4=2, ... A=12, 2=20 (premium)
const FACE_VALUES = {
  3: 1,
  4: 2,
  5: 3,
  6: 4,
  7: 5,
  8: 6,
  9: 7,
  T: 8,
  J: 9,
  Q: 10,
  K: 11,
  A: 12,
  2: 20, // 2s are premium cards
};

// Suit bonus for tie-breaking
const SUIT_BONUS = {
  c: 0,
  d: 0.25,
  h: 0.5,
  s: 0.75,
};

// Cost multipliers for different play types
const PLAY_MULTIPLIERS = {
  Singles: 1.0,
  'One Pair': 1.2,
  'Two Pair': 1.3,
  'Three of a Kind': 1.5,
  'Full House': 1.8,
  Flush: 1.6,
  '3 Card Straight': 1.2,
  '4 Card Straight': 1.3,
  '5 Card Straight': 1.4,
  '6 Card Straight': 1.5,
  '7 Card Straight': 1.6,
  '8 Card Straight': 1.7,
  '9 Card Straight': 1.8,
  '10 Card Straight': 1.9,
  '11 Card Straight': 2.0,
  '12 Card Straight': 2.1,
  '13 Card Straight': 2.2,
  'Straight Flush': 2.5,
  Bomb: 3.0, // Bombs are valuable, high cost to use
};

/**
 * Score a single card (1-21 range)
 * @param {string} cardId - Card ID like '3c' or 'As'
 * @returns {number} Score value
 */
export function scoreCard(cardId) {
  const face = cardId[0];
  const suit = cardId[1];
  return FACE_VALUES[face] + SUIT_BONUS[suit];
}

/**
 * Evaluate the cost of making a play
 * Lower scores = cheaper/better plays to make early
 * Higher scores = expensive plays to save for later
 *
 * @param {string[]} cards - Array of card IDs
 * @param {object} detection - Detection result from getDetectedCards()
 * @param {string[]} hand - Full hand for context
 * @returns {number} Cost score for this play
 */
export function evaluatePlay(cards, detection, hand) {
  if (!detection || detection.play === '---') {
    return Infinity;
  }

  // Base score is sum of card values
  let baseScore = cards.reduce((sum, cardId) => sum + scoreCard(cardId), 0);

  // Apply play type multiplier
  const multiplier = PLAY_MULTIPLIERS[detection.play] || 1.0;
  let cost = baseScore * multiplier;

  // Bonus for using low cards (we want to get rid of them)
  const avgCardValue = baseScore / cards.length;
  if (avgCardValue < 5) {
    cost *= 0.8; // Discount for low-value plays
  }

  // Penalty for using 2s (they're valuable)
  const twoCount = cards.filter(c => c[0] === '2').length;
  if (twoCount > 0) {
    cost += twoCount * 15; // Significant penalty for using 2s
  }

  return cost;
}

/**
 * Check if a card is a "high" card worth saving
 * @param {string} cardId - Card ID
 * @returns {boolean}
 */
export function isHighCard(cardId) {
  const face = cardId[0];
  return FACE_VALUES[face] >= 12; // A or 2
}

/**
 * Check if a card is a 2 (the most valuable single)
 * @param {string} cardId - Card ID
 * @returns {boolean}
 */
export function isTwo(cardId) {
  return cardId[0] === '2';
}

/**
 * Get the face value for comparison
 * @param {string} cardId - Card ID
 * @returns {number}
 */
export function getFaceValue(cardId) {
  return FACE_VALUES[cardId[0]];
}

/**
 * Get the overall card rank (for comparison in plays)
 * @param {string} cardId - Card ID
 * @returns {number}
 */
export function getCardRank(cardId) {
  return cardRank[cardId];
}
