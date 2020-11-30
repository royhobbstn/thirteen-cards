import { cardRank } from './cards.js';
import { getConsecutiveness } from './detectedCards.js';

export const detectCards_6 = (cards, suitMap, faceMap) => {
  // 6 card straight
  if (getConsecutiveness(cards)) {
    return {
      name: `6 Card Straight, ${cards[0].id} high`,
      play: '6 Card Straight',
      rank: cardRank[cards[0].id],
    };
  }

  // Bomb 3 Consecutive Pairs
  let pair = 0;
  for (let key of Object.keys(faceMap)) {
    if (faceMap[key] === 2) {
      pair++;
    }
    if (pair === 3) {
      // make new cards array out of cards 1, 3, 5 and check consecutivity
      let oddCards = [cards[1], cards[3], cards[5]];
      if (getConsecutiveness(oddCards)) {
        return {
          name: `Bomb! 3 Consecutive Pairs, ${cards[0].id} high`,
          play: 'Bomb',
          rank: 200 + cardRank[cards[0].id],
        };
      }
    }
  }

  return { name: 'Not Valid', play: '---', rank: 0 };
};
