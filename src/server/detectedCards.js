const { cardRank } = require('./cards.js');

exports.getDetectedCards = function (originalCards) {
  const cards = JSON.parse(JSON.stringify(originalCards));

  // sort cards by rank (high to low)
  cards.sort((a, b) => cardRank[b.id] - cardRank[a.id]);

  // suit hash map cards
  const suitMap = createSuitMap(cards);

  // number hash map cards
  const numMap = createNumberMap(cards);

  return '---';
};
