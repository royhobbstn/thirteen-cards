// Test fixtures for card hands

// Helper to create card objects from IDs
export const toCardObjects = cardIds => cardIds.map(id => ({ id }));

// Sample singles
export const SINGLES = {
  lowest: ['3c'],
  highest: ['2s'],
  middleLow: ['7h'],
  middleHigh: ['Ks'],
};

// Sample pairs
export const PAIRS = {
  threes: ['3c', '3d'],
  twos: ['2h', '2s'],
  kings: ['Kc', 'Ks'],
  fours: ['4h', '4s'],
};

// Sample three of a kind
export const TRIPLES = {
  threes: ['3c', '3d', '3h'],
  aces: ['Ac', 'Ad', 'Ah'],
  sevens: ['7c', '7d', '7h'],
};

// Sample four of a kind (bombs)
export const QUADS = {
  threes: ['3c', '3d', '3h', '3s'],
  aces: ['Ac', 'Ad', 'Ah', 'As'],
  nines: ['9c', '9d', '9h', '9s'],
};

// Sample straights
export const STRAIGHTS = {
  three: ['3c', '4d', '5h'],
  five: ['5c', '6d', '7h', '8s', '9c'],
  fiveLow: ['3c', '4d', '5h', '6s', '7c'],
  fiveHigh: ['Tc', 'Jd', 'Qh', 'Ks', 'Ac'],
  six: ['4c', '5d', '6h', '7s', '8c', '9d'],
  thirteen: [
    '3c',
    '4d',
    '5h',
    '6s',
    '7c',
    '8d',
    '9h',
    'Tc',
    'Jd',
    'Qh',
    'Ks',
    'Ac',
    // Note: 2s cannot be in straights
  ],
};

// Sample flushes (5 cards same suit)
export const FLUSHES = {
  clubs: ['3c', '5c', '7c', '9c', 'Jc'],
  hearts: ['4h', '6h', '8h', 'Th', 'Qh'],
  spades: ['5s', '7s', '9s', 'Js', 'Ks'],
};

// Sample straight flushes
export const STRAIGHT_FLUSHES = {
  clubsLow: ['3c', '4c', '5c', '6c', '7c'],
  heartsHigh: ['Th', 'Jh', 'Qh', 'Kh', 'Ah'],
};

// Sample full houses (triple + pair)
export const FULL_HOUSES = {
  threesOverFours: ['3c', '3d', '3h', '4c', '4d'],
  acesOverKings: ['Ac', 'Ad', 'Ah', 'Kc', 'Kd'],
  sevensOverTwos: ['7c', '7d', '7h', '2c', '2d'],
};

// Sample two pairs
export const TWO_PAIRS = {
  threesAndFours: ['3c', '3d', '4c', '4d'],
  acesAndKings: ['Ac', 'Ad', 'Kc', 'Kd'],
};

// Consecutive pairs (bomb type)
export const CONSECUTIVE_PAIRS = {
  threePairs: ['3c', '3d', '4c', '4d', '5c', '5d'],
  fourPairs: ['6c', '6d', '7c', '7d', '8c', '8d', '9c', '9d'],
};

// Invalid hands
export const INVALID = {
  empty: [],
  random: ['3c', '5d', '7h', '9s'], // 4 random cards
  almostStraight: ['3c', '4d', '5h', '7s', '8c'], // gap in middle
  almostFlush: ['3c', '5c', '7c', '9c', 'Jh'], // 4 same suit + 1 different
  straightWith2: ['Tc', 'Jd', 'Qh', 'Ks', 'Ac', '2c'], // can't include 2 in straight
};

// Complete sample hands (13 cards)
export const FULL_HANDS = {
  balanced: [
    '3c',
    '4d',
    '5h',
    '6s',
    '7c',
    '8d',
    '9h',
    'Tc',
    'Jd',
    'Qh',
    'Ks',
    'Ac',
    '2s',
  ],
  pairHeavy: [
    '3c',
    '3d',
    '5c',
    '5d',
    '7c',
    '7d',
    '9c',
    '9d',
    'Jc',
    'Jd',
    'Kc',
    'Kd',
    '2s',
  ],
  withBomb: [
    '3c',
    '3d',
    '3h',
    '3s',
    '5c',
    '6d',
    '7h',
    '8s',
    '9c',
    'Td',
    'Jh',
    'Qs',
    'Kc',
  ],
  withStraightFlush: [
    '3c',
    '4c',
    '5c',
    '6c',
    '7c',
    '8d',
    '9h',
    'Ts',
    'Jc',
    'Qd',
    'Kh',
    'As',
    '2c',
  ],
};
