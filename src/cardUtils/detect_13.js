import { cardRank } from './cards.js';
import { getConsecutiveness } from './detectedCards.js';

export const detectCards_13 = (cards, suitMap, faceMap) => {
  // 13 card straight
  if (getConsecutiveness(cards)) {
    return {
      name: `13 Card Straight, ${cards[0].id} high`,
      play: '13 Card Straight',
      rank: cardRank[cards[0].id],
    };
  }

  return { name: 'Not Valid', play: '---', rank: 0 };
};
