import { cardRank, faceRank } from './cards.js';
import { detectCards_1 } from './detect_1.js';
import { detectCards_2 } from './detect_2.js';
import { detectCards_3 } from './detect_3.js';
import { detectCards_4 } from './detect_4.js';
import { detectCards_5 } from './detect_5.js';
import { detectCards_6 } from './detect_6.js';
import { detectCards_7 } from './detect_7.js';
import { detectCards_8 } from './detect_8.js';
import { detectCards_9 } from './detect_9.js';
import { detectCards_10 } from './detect_10.js';
import { detectCards_11 } from './detect_11.js';
import { detectCards_12 } from './detect_12.js';
import { detectCards_13 } from './detect_13.js';

export const getDetectedCards = originalCards => {
  const cards = JSON.parse(JSON.stringify(originalCards));

  // sort cards by rank (high to low)
  cards.sort((a, b) => cardRank[b.id] - cardRank[a.id]);

  // suit hash map cards
  const suitMap = createSuitMap(cards);

  // number hash map cards
  const faceMap = createFaceMap(cards);

  switch (cards.length) {
    case 0:
      return { name: '', play: '', rank: 0 };
    case 1:
      return detectCards_1(cards, suitMap, faceMap);
    case 2:
      return detectCards_2(cards, suitMap, faceMap);
    case 3:
      return detectCards_3(cards, suitMap, faceMap);
    case 4:
      return detectCards_4(cards, suitMap, faceMap);
    case 5:
      return detectCards_5(cards, suitMap, faceMap);
    case 6:
      return detectCards_6(cards, suitMap, faceMap);
    case 7:
      return detectCards_7(cards, suitMap, faceMap);
    case 8:
      return detectCards_8(cards, suitMap, faceMap);
    case 9:
      return detectCards_9(cards, suitMap, faceMap);
    case 10:
      return detectCards_10(cards, suitMap, faceMap);
    case 11:
      return detectCards_11(cards, suitMap, faceMap);
    case 12:
      return detectCards_12(cards, suitMap, faceMap);
    case 13:
      return detectCards_13(cards, suitMap, faceMap);
    default:
      return { name: '', play: '', rank: 0 };
  }
};

function createSuitMap(cards) {
  const suitMap = {};

  for (let card of cards) {
    const suit = card.id[1];
    if (!suitMap[suit]) {
      suitMap[suit] = 1;
    } else {
      suitMap[suit]++;
    }
  }
  return suitMap;
}

function createFaceMap(cards) {
  const faceMap = {};

  for (let card of cards) {
    const face = card.id[0];
    if (!faceMap[face]) {
      faceMap[face] = 1;
    } else {
      faceMap[face]++;
    }
  }
  return faceMap;
}

export const getConsecutiveness = hand => {
  const cards = JSON.parse(JSON.stringify(hand));

  cards.sort((a, b) => {
    return cardRank[b.id] - cardRank[a.id];
  });

  let last = null;

  for (let card of cards) {
    const cardFace = card.id[0];

    if (!last) {
      last = faceRank[cardFace];
      continue;
    }

    if (faceRank[cardFace] === last - 1) {
      last = faceRank[cardFace];
      continue;
    } else {
      return false;
    }
  }

  return true;
};
