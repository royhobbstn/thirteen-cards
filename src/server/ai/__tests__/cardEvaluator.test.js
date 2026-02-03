import { scoreCard, evaluatePlay, isHighCard, isTwo, getFaceValue, getCardRank } from '../cardEvaluator.js';
import { cardRank } from '../../../cardUtils/cards.js';

describe('scoreCard', () => {
  describe('face values', () => {
    it('scores 3 as 1 (lowest)', () => {
      expect(scoreCard('3c')).toBeCloseTo(1, 0);
    });

    it('scores 4 as 2', () => {
      expect(scoreCard('4c')).toBeCloseTo(2, 0);
    });

    it('scores A as 12', () => {
      expect(scoreCard('Ac')).toBeCloseTo(12, 0);
    });

    it('scores 2 as 20 (premium)', () => {
      expect(scoreCard('2c')).toBeCloseTo(20, 0);
    });

    it('scores face cards correctly', () => {
      expect(scoreCard('Tc')).toBeCloseTo(8, 0); // Ten
      expect(scoreCard('Jc')).toBeCloseTo(9, 0); // Jack
      expect(scoreCard('Qc')).toBeCloseTo(10, 0); // Queen
      expect(scoreCard('Kc')).toBeCloseTo(11, 0); // King
    });
  });

  describe('suit bonuses', () => {
    it('clubs get no bonus (0)', () => {
      const score = scoreCard('3c');
      expect(score).toBe(1 + 0);
    });

    it('diamonds get 0.25 bonus', () => {
      const score = scoreCard('3d');
      expect(score).toBe(1 + 0.25);
    });

    it('hearts get 0.5 bonus', () => {
      const score = scoreCard('3h');
      expect(score).toBe(1 + 0.5);
    });

    it('spades get 0.75 bonus (highest)', () => {
      const score = scoreCard('3s');
      expect(score).toBe(1 + 0.75);
    });
  });

  it('2s has highest score', () => {
    expect(scoreCard('2s')).toBeCloseTo(20.75, 2);
  });

  it('3c has lowest score', () => {
    expect(scoreCard('3c')).toBe(1);
  });
});

describe('evaluatePlay', () => {
  const mockHand = ['3c', '4d', '5h', '6s', '7c', '8d', '9h', 'Tc', 'Jd', 'Qh', 'Ks', 'Ac', '2s'];

  describe('valid plays', () => {
    it('returns finite value for valid single', () => {
      const cards = ['3c'];
      const detection = { play: 'Singles', rank: 1 };
      const cost = evaluatePlay(cards, detection, mockHand);
      expect(Number.isFinite(cost)).toBe(true);
      expect(cost).toBeGreaterThan(0);
    });

    it('returns higher cost for higher cards', () => {
      const lowSingle = evaluatePlay(['3c'], { play: 'Singles', rank: 1 }, mockHand);
      const highSingle = evaluatePlay(['Ac'], { play: 'Singles', rank: 48 }, mockHand);
      expect(highSingle).toBeGreaterThan(lowSingle);
    });

    it('applies multiplier for play types', () => {
      const single = evaluatePlay(['3c'], { play: 'Singles', rank: 1 }, mockHand);
      const pair = evaluatePlay(['3c', '3d'], { play: 'One Pair', rank: 2 }, mockHand);
      // Pair has multiplier and more cards, so should cost more
      expect(pair).toBeGreaterThan(single);
    });
  });

  describe('invalid plays', () => {
    it('returns Infinity for invalid detection', () => {
      const cards = ['3c', '5h'];
      const detection = { play: '---', rank: 0 };
      expect(evaluatePlay(cards, detection, mockHand)).toBe(Infinity);
    });

    it('returns Infinity for null detection', () => {
      expect(evaluatePlay(['3c'], null, mockHand)).toBe(Infinity);
    });
  });

  describe('2s penalty', () => {
    it('adds penalty for using 2s', () => {
      const withoutTwo = evaluatePlay(['Ac'], { play: 'Singles', rank: 48 }, mockHand);
      const withTwo = evaluatePlay(['2c'], { play: 'Singles', rank: 49 }, mockHand);
      // 2 should cost significantly more due to penalty
      expect(withTwo - withoutTwo).toBeGreaterThan(10);
    });

    it('adds more penalty for multiple 2s', () => {
      const oneTwo = evaluatePlay(['2c'], { play: 'Singles', rank: 49 }, mockHand);
      const twoTwos = evaluatePlay(['2c', '2d'], { play: 'One Pair', rank: 50 }, mockHand);
      // Two 2s should have double the penalty plus base cost
      expect(twoTwos).toBeGreaterThan(oneTwo * 1.5);
    });
  });

  describe('low card discount', () => {
    it('discounts plays with low average card value', () => {
      const lowCards = ['3c', '4d'];
      const detection = { play: 'One Pair', rank: 2 };
      const cost = evaluatePlay(lowCards, detection, mockHand);
      // Should have discount applied (multiplier * 0.8)
      expect(cost).toBeLessThan(10);
    });
  });
});

describe('isHighCard', () => {
  it('returns true for Aces', () => {
    expect(isHighCard('Ac')).toBe(true);
    expect(isHighCard('Ad')).toBe(true);
    expect(isHighCard('Ah')).toBe(true);
    expect(isHighCard('As')).toBe(true);
  });

  it('returns true for 2s', () => {
    expect(isHighCard('2c')).toBe(true);
    expect(isHighCard('2s')).toBe(true);
  });

  it('returns false for Kings and below', () => {
    expect(isHighCard('Kc')).toBe(false);
    expect(isHighCard('Qh')).toBe(false);
    expect(isHighCard('3c')).toBe(false);
  });
});

describe('isTwo', () => {
  it('returns true for 2s', () => {
    expect(isTwo('2c')).toBe(true);
    expect(isTwo('2d')).toBe(true);
    expect(isTwo('2h')).toBe(true);
    expect(isTwo('2s')).toBe(true);
  });

  it('returns false for non-2s', () => {
    expect(isTwo('Ac')).toBe(false);
    expect(isTwo('3c')).toBe(false);
    expect(isTwo('Kh')).toBe(false);
  });
});

describe('getFaceValue', () => {
  it('returns correct face values', () => {
    expect(getFaceValue('3c')).toBe(1);
    expect(getFaceValue('Ac')).toBe(12);
    expect(getFaceValue('2c')).toBe(20);
  });
});

describe('getCardRank', () => {
  it('returns card rank from cards.js', () => {
    expect(getCardRank('3c')).toBe(cardRank['3c']);
    expect(getCardRank('2s')).toBe(cardRank['2s']);
  });
});
