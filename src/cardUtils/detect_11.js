import { cardRank } from './cards.js';
import { getConsecutiveness } from './detectedCards.js';

export const detectCards_11 = (cards, suitMap, faceMap) => {
  // 11 card straight
  if (getConsecutiveness(cards)) {
    return {
      name: `11 Card Straight, ${cards[0].id} high`,
      play: '11 Card Straight',
      rank: cardRank[cards[0].id],
    };
  }

  return { name: 'Not Valid', play: '---', rank: 0 };
};
