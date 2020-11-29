import { cardRank } from './cards';
import { getConsecutiveness } from './detectedCards';

export const detectCards_12 = (cards, suitMap, faceMap) => {
  // 12 card straight
  if (getConsecutiveness(cards)) {
    return {
      name: `12 Card Straight, ${cards[0].id} high`,
      play: '12 Card Straight',
      rank: cardRank[cards[0].id],
    };
  }

  return { name: 'Not Valid', play: '---', rank: 0 };
};
