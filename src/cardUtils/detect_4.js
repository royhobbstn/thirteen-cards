import { cardRank } from './cards.js';
import { getConsecutiveness } from './detectedCards.js';

export const detectCards_4 = (cards, suitMap, faceMap) => {
  // 4 of a kind
  for (let key of Object.keys(faceMap)) {
    if (faceMap[key] === 4) {
      return {
        name: `Bomb! Four of a Kind; ${key}'s`,
        play: 'Bomb',
        rank: 300 + cardRank[cards[0].id], // need to add 200 here to note they're higher than 3 consecutive pair bombs if the rank is ever compared.
      };
    }
  }
  // 4 card straight
  if (getConsecutiveness(cards)) {
    return {
      name: `4 Card Straight, ${cards[0].id} high`,
      play: '4 Card Straight',
      rank: cardRank[cards[0].id],
    };
  }
  // Two Pair
  let pairs = 0;
  for (let key of Object.keys(faceMap)) {
    if (faceMap[key] === 2) {
      pairs++;
    }
    if (pairs === 2) {
      return {
        name: `Two Pair, ${cards[0].id} high`,
        play: 'Two Pair',
        rank: cardRank[cards[0].id],
      };
    }
  }
  return { name: 'Not Valid', play: '---', rank: 0 };
};
