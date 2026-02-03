import {
  getStrategy,
  getAiDelay,
  AI_PERSONAS,
  AI_DISPLAY_NAMES,
  AI_COLORS,
} from '../strategies/index.js';
import { createGameRoom } from '../../../testFixtures/rooms.js';

// Helper to create a mock analysis object
function createMockAnalysis(overrides = {}) {
  return {
    validPlays: [],
    isFreePlay: false,
    mustIncludeLowest: false,
    lastPlay: { play: 'Singles', rank: 10 },
    handSize: 13,
    ...overrides,
  };
}

// Helper to create a mock play object
function createMockPlay(cards, playType, rank, score = 10) {
  return {
    cards,
    detection: { play: playType, rank },
    score,
  };
}

describe('Strategy Index', () => {
  describe('AI_PERSONAS', () => {
    it('contains all 8 personas', () => {
      expect(AI_PERSONAS).toHaveLength(8);
      expect(AI_PERSONAS).toContain('marcus');
      expect(AI_PERSONAS).toContain('eddie');
      expect(AI_PERSONAS).toContain('grandmaliu');
      expect(AI_PERSONAS).toContain('victor');
      expect(AI_PERSONAS).toContain('sophie');
      expect(AI_PERSONAS).toContain('frank');
      expect(AI_PERSONAS).toContain('ada');
      expect(AI_PERSONAS).toContain('meilin');
    });
  });

  describe('AI_DISPLAY_NAMES', () => {
    it('has display name for each persona', () => {
      for (const persona of AI_PERSONAS) {
        expect(AI_DISPLAY_NAMES[persona]).toBeDefined();
        expect(typeof AI_DISPLAY_NAMES[persona]).toBe('string');
      }
    });
  });

  describe('AI_COLORS', () => {
    it('has color for each persona', () => {
      for (const persona of AI_PERSONAS) {
        expect(AI_COLORS[persona]).toBeDefined();
        expect(AI_COLORS[persona]).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  describe('getStrategy', () => {
    it('returns strategy for each persona', () => {
      for (const persona of AI_PERSONAS) {
        const strategy = getStrategy(persona);
        expect(strategy).toBeDefined();
        expect(strategy.name).toBe(persona);
      }
    });

    it('defaults to marcus for unknown persona', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const strategy = getStrategy('unknown');
      expect(strategy.name).toBe('marcus');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getAiDelay', () => {
    it('returns delay for marcus', () => {
      const delay = getAiDelay('marcus');
      expect(delay).toBeGreaterThanOrEqual(1500);
      expect(delay).toBeLessThanOrEqual(3000);
    });

    it('returns faster delay for eddie', () => {
      const delay = getAiDelay('eddie');
      expect(delay).toBeGreaterThanOrEqual(500);
      expect(delay).toBeLessThanOrEqual(1500);
    });

    it('returns slower delay for grandmaliu', () => {
      const delay = getAiDelay('grandmaliu');
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThanOrEqual(4000);
    });
  });
});

describe('BaseStrategy (via getStrategy)', () => {
  let strategy;

  beforeEach(() => {
    strategy = getStrategy('marcus');
  });

  describe('choosePlay', () => {
    it('returns null when no valid plays', () => {
      const analysis = createMockAnalysis({ validPlays: [] });
      const room = createGameRoom(2);
      expect(strategy.choosePlay(analysis, room, 0)).toBeNull();
    });

    it('returns a play when valid plays exist', () => {
      const play = createMockPlay(['3c'], 'Singles', 1, 5);
      const analysis = createMockAnalysis({ validPlays: [play] });
      const room = createGameRoom(2);
      room.cards[0] = ['3c', '4d'];
      room.cards[2] = ['5h', '6s', '7c'];

      const chosen = strategy.choosePlay(analysis, room, 0);
      expect(chosen).toBeDefined();
    });
  });

  describe('getOpponentCardCounts', () => {
    it('returns counts for active opponents', () => {
      const room = createGameRoom(4);
      room.cards[0] = ['3c', '4d', '5h'];
      room.cards[1] = ['6c', '7d'];
      room.cards[2] = ['8c'];
      room.cards[3] = ['9c', 'Tc', 'Jc', 'Qc'];

      const counts = strategy.getOpponentCardCounts(room, 0);
      expect(counts).toHaveLength(3);
    });

    it('excludes finished players', () => {
      const room = createGameRoom(4);
      room.cards = [['3c'], ['4d'], null, ['5h']];
      room.rank = [null, null, 1, null];

      const counts = strategy.getOpponentCardCounts(room, 0);
      const seat2Count = counts.find(c => c.seatIndex === 2);
      expect(seat2Count).toBeUndefined();
    });
  });

  describe('isAnyOpponentLow', () => {
    it('returns true when opponent has few cards', () => {
      const room = createGameRoom(2);
      room.cards[0] = ['3c', '4d', '5h', '6s', '7c'];
      room.cards[2] = ['8c', '9d'];

      expect(strategy.isAnyOpponentLow(room, 0, 3)).toBe(true);
    });

    it('returns false when all opponents have many cards', () => {
      const room = createGameRoom(2);
      room.cards[0] = ['3c', '4d', '5h', '6s', '7c'];
      room.cards[2] = ['8c', '9d', 'Tc', 'Jc', 'Qc'];

      expect(strategy.isAnyOpponentLow(room, 0, 3)).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('countTwos counts 2s in cards', () => {
      expect(strategy.countTwos(['2c', '2d', '3c'])).toBe(2);
      expect(strategy.countTwos(['3c', '4d', '5h'])).toBe(0);
    });

    it('countHighCards counts aces and 2s', () => {
      expect(strategy.countHighCards(['Ac', 'Ad', '2c'])).toBe(3);
      expect(strategy.countHighCards(['3c', 'Kc'])).toBe(0);
    });

    it('isBomb identifies bombs', () => {
      const bomb = createMockPlay(['3c', '3d', '3h', '3s'], 'Bomb', 100);
      const single = createMockPlay(['3c'], 'Singles', 1);
      expect(strategy.isBomb(bomb)).toBe(true);
      expect(strategy.isBomb(single)).toBe(false);
    });

    it('isLowCardPlay identifies low card plays', () => {
      const lowPlay = createMockPlay(['3c', '4d', '5h'], '3 Card Straight', 5);
      const highPlay = createMockPlay(['Tc', 'Jd', 'Qh'], '3 Card Straight', 40);
      expect(strategy.isLowCardPlay(lowPlay)).toBe(true);
      expect(strategy.isLowCardPlay(highPlay)).toBe(false);
    });
  });
});

describe('Strategy-specific behaviors', () => {
  describe('MarcusStrategy', () => {
    let strategy;

    beforeEach(() => {
      strategy = getStrategy('marcus');
    });

    it('has correct delay range', () => {
      expect(strategy.minDelay).toBe(1500);
      expect(strategy.maxDelay).toBe(3000);
    });

    it('filters out bombs when opponent not low', () => {
      const room = createGameRoom(2);
      room.cards[0] = ['3c', '3d', '3h', '3s', '4c'];
      room.cards[2] = ['5c', '6d', '7h', '8s', '9c'];

      const bomb = createMockPlay(['3c', '3d', '3h', '3s'], 'Bomb', 100);
      const single = createMockPlay(['4c'], 'Singles', 5);
      const plays = [single, bomb];

      const filtered = strategy.filterPlays(plays, {}, room, 0);
      expect(filtered).not.toContain(bomb);
      expect(filtered).toContain(single);
    });
  });

  describe('EddieStrategy', () => {
    let strategy;

    beforeEach(() => {
      strategy = getStrategy('eddie');
    });

    it('has fast delay range', () => {
      expect(strategy.minDelay).toBe(500);
      expect(strategy.maxDelay).toBe(1500);
    });

    it('never voluntarily passes', () => {
      const analysis = createMockAnalysis({
        validPlays: [createMockPlay(['2c'], 'Singles', 49)],
      });
      const room = createGameRoom(2);
      expect(strategy.shouldPass(analysis, room, 0)).toBe(false);
    });

    it('does not filter plays', () => {
      const bomb = createMockPlay(['3c', '3d', '3h', '3s'], 'Bomb', 100);
      const single = createMockPlay(['2c'], 'Singles', 49);
      const plays = [single, bomb];

      const filtered = strategy.filterPlays(plays, {}, {}, 0);
      expect(filtered).toEqual(plays);
    });
  });

  describe('GrandmaLiuStrategy', () => {
    let strategy;

    beforeEach(() => {
      strategy = getStrategy('grandmaliu');
    });

    it('has slow delay range', () => {
      expect(strategy.minDelay).toBe(2000);
      expect(strategy.maxDelay).toBe(4000);
    });

    it('prefers singles when available', () => {
      const single = createMockPlay(['3c'], 'Singles', 1, 5);
      const pair = createMockPlay(['4c', '4d'], 'One Pair', 5, 8);

      const selected = strategy.selectFromFiltered([pair, single], {}, {}, 0);
      expect(selected).toBe(single);
    });
  });

  describe('VictorStrategy', () => {
    let strategy;

    beforeEach(() => {
      strategy = getStrategy('victor');
    });

    it('has calculating delay range', () => {
      expect(strategy.minDelay).toBe(1800);
      expect(strategy.maxDelay).toBe(3500);
    });

    it('groups cards by face', () => {
      const hand = ['3c', '3d', '4h', '4s', '4c'];
      const groups = strategy.groupByFace(hand);
      expect(groups['3']).toEqual(['3c', '3d']);
      expect(groups['4']).toEqual(['4h', '4s', '4c']);
    });

    it('finds bomb potential faces', () => {
      const hand = ['3c', '3d', '3h', '4s', '4c', '5h'];
      const faces = strategy.getBombPotentialFaces(hand);
      expect(faces).toContain('3');
      expect(faces).not.toContain('4');
    });
  });

  describe('SophieStrategy', () => {
    let strategy;

    beforeEach(() => {
      strategy = getStrategy('sophie');
    });

    it('has pattern recognition delay range', () => {
      expect(strategy.minDelay).toBe(1200);
      expect(strategy.maxDelay).toBe(2500);
    });

    it('identifies straights', () => {
      const straight = createMockPlay(['3c', '4d', '5h'], '3 Card Straight', 5);
      expect(strategy.isStraight(straight)).toBe(true);
    });

    it('identifies straight flushes', () => {
      const straightFlush = createMockPlay(['3c', '4c', '5c', '6c', '7c'], 'Straight Flush', 120);
      expect(strategy.isStraightFlush(straightFlush)).toBe(true);
    });
  });

  describe('FrankStrategy', () => {
    let strategy;

    beforeEach(() => {
      strategy = getStrategy('frank');
    });

    it('has variable delay range', () => {
      expect(strategy.minDelay).toBe(1000);
      expect(strategy.maxDelay).toBe(4000);
    });

    it('identifies strong hands', () => {
      const bomb = createMockPlay(['3c', '3d', '3h', '3s'], 'Bomb', 100);
      const analysis = createMockAnalysis({ validPlays: [bomb] });
      expect(strategy.hasStrongHand(analysis, ['3c', '3d', '3h', '3s'])).toBe(true);
    });
  });

  describe('AdaStrategy', () => {
    let strategy;

    beforeEach(() => {
      strategy = getStrategy('ada');
    });

    it('has calculating delay range', () => {
      expect(strategy.minDelay).toBe(2500);
      expect(strategy.maxDelay).toBe(4500);
    });

    it('calculates play value', () => {
      const play = createMockPlay(['3c', '4d'], 'One Pair', 5);
      const value = strategy.getPlayValue(play);
      expect(value).toBeGreaterThan(0);
    });

    it('calculates efficiency', () => {
      const play = createMockPlay(['3c', '4c'], 'One Pair', 5);
      const efficiency = strategy.getEfficiency(play);
      expect(efficiency).toBeGreaterThan(0);
    });
  });

  describe('MeiLinStrategy', () => {
    let strategy;

    beforeEach(() => {
      strategy = getStrategy('meilin');
    });

    it('has measured delay range', () => {
      expect(strategy.minDelay).toBe(1500);
      expect(strategy.maxDelay).toBe(3000);
    });

    it('determines game phase based on hand size', () => {
      const room = createGameRoom(2);
      room.cards[2] = ['8c', '9d', 'Tc', 'Jc', 'Qc'];

      // Early phase: 9+ cards
      const bigHand = ['3c', '4d', '5h', '6s', '7c', '8d', '9h', 'Tc', 'Jd'];
      expect(strategy.getGamePhase(bigHand, room, 0)).toBe('early');

      // Mid phase: 5-8 cards
      const midHand = ['3c', '4d', '5h', '6s', '7c'];
      expect(strategy.getGamePhase(midHand, room, 0)).toBe('mid');

      // Endgame phase: <5 cards
      const smallHand = ['3c', '4d', '5h', '6s'];
      expect(strategy.getGamePhase(smallHand, room, 0)).toBe('endgame');
    });
  });
});
