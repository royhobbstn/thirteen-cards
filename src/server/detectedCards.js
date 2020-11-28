const { cardRank } = require('./cards.js');
const { detectCards_1 } = require('./handReading/detect_1.js');
const { detectCards_2 } = require('./handReading/detect_2.js');
const { detectCards_3 } = require('./handReading/detect_3.js');
const { detectCards_4 } = require('./handReading/detect_4.js');
const { detectCards_5 } = require('./handReading/detect_5.js');
const { detectCards_6 } = require('./handReading/detect_6.js');
const { detectCards_7 } = require('./handReading/detect_7.js');
const { detectCards_8 } = require('./handReading/detect_8.js');
const { detectCards_9 } = require('./handReading/detect_9.js');
const { detectCards_10 } = require('./handReading/detect_10.js');
const { detectCards_11 } = require('./handReading/detect_11.js');
const { detectCards_12 } = require('./handReading/detect_12.js');
const { detectCards_13 } = require('./handReading/detect_13.js');

exports.getDetectedCards = function (originalCards) {
  const cards = JSON.parse(JSON.stringify(originalCards));

  // sort cards by rank (high to low)
  cards.sort((a, b) => cardRank[b.id] - cardRank[a.id]);

  // suit hash map cards
  const suitMap = createSuitMap(cards);

  // number hash map cards
  const faceMap = createFaceMap(cards);

  console.log(suitMap);

  console.log(faceMap);

  switch (cards.length) {
    case 0:
      return 'Nothing';
    case 1:
      return detectCards_1(cards, suitMap, faceMap);
    case 2:
      return detectCards_2(cards, suitMap, faceMap);
    case 3:
      return detectCards_3(cards, suitMap, faceMap);
    case 4:
      return detectCards_4(cards, suitMap, faceMap);
    case 5:
      return detectCards_5(cards, suitMap, faceMap);
    case 6:
      return detectCards_6(cards, suitMap, faceMap);
    case 7:
      return detectCards_7(cards, suitMap, faceMap);
    case 8:
      return detectCards_8(cards, suitMap, faceMap);
    case 9:
      return detectCards_9(cards, suitMap, faceMap);
    case 10:
      return detectCards_10(cards, suitMap, faceMap);
    case 11:
      return detectCards_11(cards, suitMap, faceMap);
    case 12:
      return detectCards_12(cards, suitMap, faceMap);
    case 13:
      return detectCards_13(cards, suitMap, faceMap);
    default:
      return 'Unexpected';
  }
};

function createSuitMap(cards) {
  const suitMap = {};

  for (let card of cards) {
    const suit = card.id[1];
    if (!suitMap[suit]) {
      suitMap[suit] = 1;
    } else {
      suitMap[suit]++;
    }
  }
  return suitMap;
}

function createFaceMap(cards) {
  const faceMap = {};

  for (let card of cards) {
    const face = card.id[0];
    if (!faceMap[face]) {
      faceMap[face] = 1;
    } else {
      faceMap[face]++;
    }
  }
  return faceMap;
}
