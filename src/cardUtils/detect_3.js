import { cardRank } from './cards';
import { getConsecutiveness } from './detectedCards';

export const detectCards_3 = (cards, suitMap, faceMap) => {
  // 3 of a kind
  for (let key of Object.keys(faceMap)) {
    if (faceMap[key] === 3) {
      return {
        name: `Three of a Kind; ${key}'s`,
        play: 'Three of a Kind',
        rank: cardRank[cards[0].id],
      };
    }
  }
  // 3 card straight
  if (getConsecutiveness(cards)) {
    return {
      name: `3 Card Straight, ${cards[0].id} high`,
      play: '3 Card Straight',
      rank: cardRank[cards[0].id],
    };
  }
  //
  return { name: 'Not Valid', play: '---', rank: 0 };
};
