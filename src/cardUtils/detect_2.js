import { cardRank } from './cards';

export const detectCards_2 = (cards, suitMap, faceMap) => {
  //
  for (let key of Object.keys(faceMap)) {
    if (faceMap[key] === 2) {
      return {
        name: `Pair of ${key}'s, ${cards[0].id} high`,
        play: 'One Pair',
        rank: cardRank[cards[0].id],
      };
    }
  }
  return { name: 'Not Valid', play: '---', rank: 0 };
};
