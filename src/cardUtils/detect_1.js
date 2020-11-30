import { cardRank } from './cards.js';

export const detectCards_1 = (cards, suitMap, faceMap) => {
  //
  return { name: `Single, ${cards[0].id}`, play: 'Singles', rank: cardRank[cards[0].id] };
};
