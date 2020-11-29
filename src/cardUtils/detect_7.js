import { cardRank } from './cards';
import { getConsecutiveness } from './detectedCards';

export const detectCards_7 = (cards, suitMap, faceMap) => {
  // 7 card straight
  if (getConsecutiveness(cards)) {
    return {
      name: `7 Card Straight, ${cards[0].id} high`,
      play: '7 Card Straight',
      rank: cardRank[cards[0].id],
    };
  }

  return { name: 'Not Valid', play: '---', rank: 0 };
};
