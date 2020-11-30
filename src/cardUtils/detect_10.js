import { cardRank } from './cards.js';
import { getConsecutiveness } from './detectedCards.js';

export const detectCards_10 = (cards, suitMap, faceMap) => {
  // 10 card straight
  if (getConsecutiveness(cards)) {
    return {
      name: `10 Card Straight, ${cards[0].id} high`,
      play: '10 Card Straight',
      rank: cardRank[cards[0].id],
    };
  }

  return { name: 'Not Valid', play: '---', rank: 0 };
};
