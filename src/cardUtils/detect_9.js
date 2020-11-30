import { cardRank } from './cards.js';
import { getConsecutiveness } from './detectedCards.js';

export const detectCards_9 = (cards, suitMap, faceMap) => {
  // 9 card straight
  if (getConsecutiveness(cards)) {
    return {
      name: `9 Card Straight, ${cards[0].id} high`,
      play: '9 Card Straight',
      rank: cardRank[cards[0].id],
    };
  }

  return { name: 'Not Valid', play: '---', rank: 0 };
};
