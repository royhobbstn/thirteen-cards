import { cardRank } from './cards';
import { getConsecutiveness } from './detectedCards';

export const detectCards_8 = (cards, suitMap, faceMap) => {
  // 8 card straight
  if (getConsecutiveness(cards)) {
    return {
      name: `8 Card Straight, ${cards[0].id} high`,
      play: '8 Card Straight',
      rank: cardRank[cards[0].id],
    };
  }

  return { name: 'Not Valid', play: '---', rank: 0 };
};
