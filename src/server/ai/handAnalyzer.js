import { getDetectedCards } from '../../cardUtils/detectedCards.js';
import { cardRank, faceRank } from '../../cardUtils/cards.js';
import { evaluatePlay } from './cardEvaluator.js';
import { getLastPlay } from '../server-util.js';

/**
 * Analyze an AI's hand and return all valid plays
 * @param {string[]} hand - Array of card IDs in the AI's hand
 * @param {object} room - Room state
 * @param {number} seatIndex - AI's seat index
 * @returns {object} Analysis result with validPlays array
 */
export function analyzeHand(hand, room, seatIndex) {
  const lastPlay = getLastPlay(room, seatIndex);
  const isFreePlay = lastPlay.play === 'Free Play';
  const mustIncludeLowest = room.initial;

  // Generate all possible plays
  let candidates = generateAllPlays(hand);

  // Filter to valid plays that beat the board
  let validPlays = candidates.filter(play => {
    // Check initial play constraint
    if (mustIncludeLowest && !play.cards.includes(room.lowest)) {
      return false;
    }

    // Free play - any valid combination works
    if (isFreePlay) {
      return play.detection.play !== '---';
    }

    // Must beat the board
    return playBeatsBoard(play.detection, lastPlay);
  });

  // Score each play and sort by cost (lowest first)
  validPlays = validPlays.map(play => ({
    ...play,
    score: evaluatePlay(play.cards, play.detection, hand),
  }));

  validPlays.sort((a, b) => a.score - b.score);

  return {
    validPlays,
    isFreePlay,
    mustIncludeLowest,
    lastPlay,
    handSize: hand.length,
  };
}

/**
 * Check if a play beats the current board
 */
function playBeatsBoard(detection, lastPlay) {
  if (detection.play === '---') return false;

  // Bombs beat anything
  if (detection.play === 'Bomb') return true;

  // Same play type with higher rank
  if (detection.play === lastPlay.play && detection.rank > lastPlay.rank) {
    return true;
  }

  // Straight Flush can beat Straight or Flush of same length
  if (detection.play === 'Straight Flush') {
    // Check if lastPlay is a straight (e.g., "5 Card Straight")
    if (lastPlay.play.includes('Straight') && !lastPlay.play.includes('Flush') && detection.rank > lastPlay.rank) {
      return true;
    }
    if (lastPlay.play === 'Flush' && detection.rank > lastPlay.rank) return true;
  }

  return false;
}

/**
 * Generate all possible plays from a hand
 */
function generateAllPlays(hand) {
  const plays = [];

  // Singles
  plays.push(...generateSingles(hand));

  // Pairs
  plays.push(...generatePairs(hand));

  // Three of a kind
  plays.push(...generateTriples(hand));

  // Four of a kind (Bomb)
  plays.push(...generateQuads(hand));

  // Two Pair
  plays.push(...generateTwoPairs(hand));

  // Straights (3-13 cards)
  for (let len = 3; len <= Math.min(13, hand.length); len++) {
    plays.push(...generateStraights(hand, len));
  }

  // Consecutive pairs (Bomb) - 3+ pairs
  plays.push(...generateConsecutivePairs(hand));

  // Flushes (5+ cards same suit)
  plays.push(...generateFlushes(hand));

  // Full Houses
  plays.push(...generateFullHouses(hand));

  return plays;
}

/**
 * Generate all single card plays
 */
function generateSingles(hand) {
  return hand.map(cardId => {
    const cards = [cardId];
    const detection = getDetectedCards(cards.map(id => ({ id })));
    return { cards, detection };
  });
}

/**
 * Generate all pair plays
 */
function generatePairs(hand) {
  const plays = [];
  const byFace = groupByFace(hand);

  for (const [face, cards] of Object.entries(byFace)) {
    if (cards.length >= 2) {
      // Generate all 2-combinations
      const combos = combinations(cards, 2);
      for (const combo of combos) {
        const detection = getDetectedCards(combo.map(id => ({ id })));
        if (detection.play === 'One Pair') {
          plays.push({ cards: combo, detection });
        }
      }
    }
  }

  return plays;
}

/**
 * Generate all three-of-a-kind plays
 */
function generateTriples(hand) {
  const plays = [];
  const byFace = groupByFace(hand);

  for (const [face, cards] of Object.entries(byFace)) {
    if (cards.length >= 3) {
      const combos = combinations(cards, 3);
      for (const combo of combos) {
        const detection = getDetectedCards(combo.map(id => ({ id })));
        if (detection.play === 'Three of a Kind') {
          plays.push({ cards: combo, detection });
        }
      }
    }
  }

  return plays;
}

/**
 * Generate four-of-a-kind bomb plays
 */
function generateQuads(hand) {
  const plays = [];
  const byFace = groupByFace(hand);

  for (const [face, cards] of Object.entries(byFace)) {
    if (cards.length === 4) {
      const detection = getDetectedCards(cards.map(id => ({ id })));
      if (detection.play === 'Bomb') {
        plays.push({ cards, detection });
      }
    }
  }

  return plays;
}

/**
 * Generate two pair plays
 */
function generateTwoPairs(hand) {
  const plays = [];
  const byFace = groupByFace(hand);

  // Find all faces with at least 2 cards
  const pairFaces = Object.entries(byFace).filter(([, cards]) => cards.length >= 2);

  // Need at least 2 different faces with pairs
  if (pairFaces.length < 2) return plays;

  // Generate all combinations of 2 different pairs
  for (let i = 0; i < pairFaces.length; i++) {
    for (let j = i + 1; j < pairFaces.length; j++) {
      const [face1, cards1] = pairFaces[i];
      const [face2, cards2] = pairFaces[j];

      const pair1Combos = combinations(cards1, 2);
      const pair2Combos = combinations(cards2, 2);

      for (const pair1 of pair1Combos) {
        for (const pair2 of pair2Combos) {
          const combo = [...pair1, ...pair2];
          const detection = getDetectedCards(combo.map(id => ({ id })));
          if (detection.play === 'Two Pair') {
            plays.push({ cards: combo, detection });
          }
        }
      }
    }
  }

  return plays;
}

/**
 * Generate straight plays of specified length
 */
function generateStraights(hand, length) {
  const plays = [];
  const byFace = groupByFace(hand);
  const faces = Object.keys(byFace).sort((a, b) => faceRank[a] - faceRank[b]);

  // Find all consecutive sequences of faces
  for (let startIdx = 0; startIdx <= faces.length - length; startIdx++) {
    const facesNeeded = [];
    let valid = true;

    for (let i = 0; i < length; i++) {
      const expectedFace = faces[startIdx + i];
      if (i > 0) {
        const prevFaceRank = faceRank[faces[startIdx + i - 1]];
        const currFaceRank = faceRank[expectedFace];
        if (currFaceRank !== prevFaceRank + 1) {
          valid = false;
          break;
        }
      }
      facesNeeded.push(expectedFace);
    }

    // Straights cannot include 2s
    if (facesNeeded.includes('2')) {
      valid = false;
    }

    if (valid && facesNeeded.length === length) {
      // Generate all card combinations for this straight
      const cardOptions = facesNeeded.map(face => byFace[face]);
      const allCombos = cartesianProduct(cardOptions);

      for (const combo of allCombos) {
        const detection = getDetectedCards(combo.map(id => ({ id })));
        if (
          detection.play.includes('Straight') &&
          !detection.play.includes('Flush') &&
          combo.length === length
        ) {
          plays.push({ cards: combo, detection });
        }
      }
    }
  }

  return plays;
}

/**
 * Generate consecutive pair bombs (3+ consecutive pairs)
 */
function generateConsecutivePairs(hand) {
  const plays = [];
  const byFace = groupByFace(hand);

  // Find faces with at least 2 cards
  const facesWithPairs = Object.entries(byFace)
    .filter(([face, cards]) => cards.length >= 2 && face !== '2')
    .sort((a, b) => faceRank[a[0]] - faceRank[b[0]]);

  // Find consecutive sequences of 3+ pairs
  for (let numPairs = 3; numPairs <= facesWithPairs.length; numPairs++) {
    for (let startIdx = 0; startIdx <= facesWithPairs.length - numPairs; startIdx++) {
      const pairFaces = facesWithPairs.slice(startIdx, startIdx + numPairs);

      // Check if faces are consecutive
      let consecutive = true;
      for (let i = 1; i < pairFaces.length; i++) {
        if (faceRank[pairFaces[i][0]] !== faceRank[pairFaces[i - 1][0]] + 1) {
          consecutive = false;
          break;
        }
      }

      if (consecutive) {
        // Generate all pair combinations
        const pairOptions = pairFaces.map(([face, cards]) => combinations(cards, 2));
        const allCombos = cartesianProduct(pairOptions);

        for (const combo of allCombos) {
          const flatCombo = combo.flat();
          const detection = getDetectedCards(flatCombo.map(id => ({ id })));
          if (detection.play === 'Bomb') {
            plays.push({ cards: flatCombo, detection });
          }
        }
      }
    }
  }

  return plays;
}

/**
 * Generate flush plays (5+ cards same suit)
 */
function generateFlushes(hand) {
  const plays = [];
  const bySuit = groupBySuit(hand);

  for (const [suit, cards] of Object.entries(bySuit)) {
    if (cards.length >= 5) {
      // Generate all 5-card combinations from same suit
      const combos = combinations(cards, 5);
      for (const combo of combos) {
        const detection = getDetectedCards(combo.map(id => ({ id })));
        if (detection.play === 'Flush' || detection.play === 'Straight Flush') {
          plays.push({ cards: combo, detection });
        }
      }
    }
  }

  return plays;
}

/**
 * Generate full house plays (triple + pair)
 */
function generateFullHouses(hand) {
  const plays = [];
  const byFace = groupByFace(hand);

  // Find all triples and pairs
  const tripleFaces = Object.entries(byFace).filter(([, cards]) => cards.length >= 3);
  const pairFaces = Object.entries(byFace).filter(([, cards]) => cards.length >= 2);

  for (const [tripleFace, tripleCards] of tripleFaces) {
    const tripleCombos = combinations(tripleCards, 3);

    for (const [pairFace, pairCards] of pairFaces) {
      if (pairFace === tripleFace) continue; // Can't use same face for both

      const pairCombos = combinations(pairCards, 2);

      for (const triple of tripleCombos) {
        for (const pair of pairCombos) {
          const combo = [...triple, ...pair];
          const detection = getDetectedCards(combo.map(id => ({ id })));
          if (detection.play === 'Full House') {
            plays.push({ cards: combo, detection });
          }
        }
      }
    }
  }

  return plays;
}

// Helper functions

function groupByFace(hand) {
  const groups = {};
  for (const cardId of hand) {
    const face = cardId[0];
    if (!groups[face]) groups[face] = [];
    groups[face].push(cardId);
  }
  return groups;
}

function groupBySuit(hand) {
  const groups = {};
  for (const cardId of hand) {
    const suit = cardId[1];
    if (!groups[suit]) groups[suit] = [];
    groups[suit].push(cardId);
  }
  return groups;
}

function combinations(arr, r) {
  if (r > arr.length || r <= 0) return [];
  if (r === arr.length) return [arr];
  if (r === 1) return arr.map(x => [x]);

  const result = [];
  for (let i = 0; i <= arr.length - r; i++) {
    const head = arr.slice(i, i + 1);
    const tailCombos = combinations(arr.slice(i + 1), r - 1);
    for (const tail of tailCombos) {
      result.push([...head, ...tail]);
    }
  }
  return result;
}

function cartesianProduct(arrays) {
  if (arrays.length === 0) return [[]];
  if (arrays.length === 1) return arrays[0].map(x => [x]);

  const result = [];
  const rest = cartesianProduct(arrays.slice(1));

  for (const item of arrays[0]) {
    for (const combo of rest) {
      result.push([item, ...combo]);
    }
  }

  return result;
}
