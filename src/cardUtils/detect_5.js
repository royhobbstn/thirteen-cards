import { cardRank } from './cards.js';
import { getConsecutiveness } from './detectedCards.js';

export const detectCards_5 = (cards, suitMap, faceMap) => {
  let flush = null;
  let straight = null;

  // Flush
  for (let key of Object.keys(suitMap)) {
    if (suitMap[key] === 5) {
      flush = {
        name: `Flush, ${cards[0].id} high`,
        play: 'Flush',
        rank: cardRank[cards[0].id],
      };
    }
  }
  // 5 card straight
  if (getConsecutiveness(cards)) {
    straight = {
      name: `5 Card Straight, ${cards[0].id} high`,
      play: '5 Card Straight',
      rank: cardRank[cards[0].id],
    };
  }

  if (flush && straight) {
    return {
      name: `Straight Flush, ${cards[0].id} high`,
      play: 'Straight Flush',
      rank: 100 + cardRank[cards[0].id],
    };
  }

  if (flush) {
    return flush;
  }

  if (straight) {
    return straight;
  }

  // Full House
  let pair = 0;
  let threeOfAKind = 0;
  let highCard = null;
  let faceKey = null;
  for (let key of Object.keys(faceMap)) {
    if (faceMap[key] === 2) {
      pair++;
    }
    if (faceMap[key] === 3) {
      threeOfAKind++;
      faceKey = key;
      for (let card of cards) {
        if (!highCard && card.id[0] === key) {
          highCard = card.id;
        }
      }
    }
    if (pair === 1 && threeOfAKind === 1) {
      return {
        name: `Full House of ${faceKey}s`,
        play: 'Full House',
        rank: cardRank[highCard],
      };
    }
  }
  return { name: 'Not Valid', play: '---', rank: 0 };
};
