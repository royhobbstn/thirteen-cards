import { analyzeHand } from '../handAnalyzer.js';
import { createGameRoom, DETECTIONS } from '../../../testFixtures/rooms.js';
import { FULL_HANDS, PAIRS, STRAIGHTS } from '../../../testFixtures/cards.js';

describe('analyzeHand', () => {
  describe('basic analysis', () => {
    it('returns analysis object with required properties', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '4d', '5h'];

      const analysis = analyzeHand(room.cards[0], room, 0);

      expect(analysis).toHaveProperty('validPlays');
      expect(analysis).toHaveProperty('isFreePlay');
      expect(analysis).toHaveProperty('mustIncludeLowest');
      expect(analysis).toHaveProperty('lastPlay');
      expect(analysis).toHaveProperty('handSize');
    });

    it('correctly identifies free play', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '4d', '5h'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      expect(analysis.isFreePlay).toBe(true);
    });

    it('correctly identifies must include lowest', () => {
      const room = createGameRoom(2, {
        initial: true,
        lowest: '3c',
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '4d', '5h'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      expect(analysis.mustIncludeLowest).toBe(true);
    });
  });

  describe('generates valid plays', () => {
    it('generates singles from hand', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '4d', '5h'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const singles = analysis.validPlays.filter(p => p.detection.play === 'Singles');

      expect(singles.length).toBe(3); // one for each card
    });

    it('generates pairs when available', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '3d', '5h'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const pairs = analysis.validPlays.filter(p => p.detection.play === 'One Pair');

      expect(pairs.length).toBe(1);
    });

    it('generates straights when available', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '4d', '5h', '6s', '7c'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const straights = analysis.validPlays.filter(p => p.detection.play.includes('Straight'));

      expect(straights.length).toBeGreaterThan(0);
    });

    it('generates bombs when available', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '3d', '3h', '3s', '5c'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const bombs = analysis.validPlays.filter(p => p.detection.play === 'Bomb');

      expect(bombs.length).toBe(1);
    });
  });

  describe('filters plays based on board', () => {
    it('only includes plays that beat the board', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [{ play: 'Singles', rank: 20 }, null, null, null], // 7s on board
        turnIndex: 2,
      });
      room.cards[2] = ['3c', '5d', '8h', 'Kc']; // 3, 5 won't beat, 8 and K will

      const analysis = analyzeHand(room.cards[2], room, 2);
      const singles = analysis.validPlays.filter(p => p.detection.play === 'Singles');

      // Only 8 and K should be valid
      expect(singles.length).toBe(2);
      expect(singles.every(s => s.detection.rank > 20)).toBe(true);
    });

    it('allows bombs on any play', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [{ play: 'One Pair', rank: 50 }, null, null, null], // pair of 2s
        turnIndex: 2,
      });
      room.cards[2] = ['3c', '3d', '3h', '3s', '5c'];

      const analysis = analyzeHand(room.cards[2], room, 2);
      const bombs = analysis.validPlays.filter(p => p.detection.play === 'Bomb');

      expect(bombs.length).toBe(1);
    });
  });

  describe('initial play constraint', () => {
    it('only includes plays with lowest card on initial', () => {
      const room = createGameRoom(2, {
        initial: true,
        lowest: '3c',
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '4d', '5h', '6s'];

      const analysis = analyzeHand(room.cards[0], room, 0);

      // All valid plays should include '3c'
      expect(analysis.validPlays.every(p => p.cards.includes('3c'))).toBe(true);
    });

    it('returns empty if lowest card not in plays', () => {
      const room = createGameRoom(2, {
        initial: true,
        lowest: '3c',
        last: [null, null, null, null],
      });
      // Hand without the lowest card
      room.cards[0] = ['4d', '5h', '6s'];

      const analysis = analyzeHand(room.cards[0], room, 0);

      expect(analysis.validPlays.length).toBe(0);
    });
  });

  describe('play scoring', () => {
    it('sorts plays by score (lowest first)', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', 'Kd', '2s'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const scores = analysis.validPlays.map(p => p.score);

      // Scores should be in ascending order
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
      }
    });

    it('assigns score to each play', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '4d'];

      const analysis = analyzeHand(room.cards[0], room, 0);

      expect(analysis.validPlays.every(p => typeof p.score === 'number')).toBe(true);
    });
  });

  describe('with full hand', () => {
    it('generates many plays from a full 13-card hand', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = FULL_HANDS.balanced;

      const analysis = analyzeHand(room.cards[0], room, 0);

      // Should have at least 13 singles + various combinations
      expect(analysis.validPlays.length).toBeGreaterThan(13);
    });

    it('finds bombs in hand with four of a kind', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = FULL_HANDS.withBomb;

      const analysis = analyzeHand(room.cards[0], room, 0);
      const bombs = analysis.validPlays.filter(p => p.detection.play === 'Bomb');

      expect(bombs.length).toBeGreaterThan(0);
    });
  });

  describe('playBeatsBoard edge cases', () => {
    it('straight flush beats regular straight of same length', () => {
      const room = createGameRoom(2, {
        initial: false,
        // 5-card straight on board
        last: [{ play: '5 Card Straight', rank: 20 }, null, null, null],
        turnIndex: 2,
      });
      room.cards[2] = ['3c', '4c', '5c', '6c', '7c']; // Straight flush

      const analysis = analyzeHand(room.cards[2], room, 2);
      const straightFlushes = analysis.validPlays.filter(p => p.detection.play === 'Straight Flush');

      expect(straightFlushes.length).toBeGreaterThan(0);
    });

    it('straight flush beats flush', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [{ play: 'Flush', rank: 30 }, null, null, null],
        turnIndex: 2,
      });
      room.cards[2] = ['3c', '4c', '5c', '6c', '7c']; // Straight flush with higher rank

      const analysis = analyzeHand(room.cards[2], room, 2);
      const straightFlushes = analysis.validPlays.filter(p => p.detection.play === 'Straight Flush');

      expect(straightFlushes.length).toBeGreaterThan(0);
    });

    it('rejects plays that do not beat the board type', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [{ play: 'One Pair', rank: 10 }, null, null, null],
        turnIndex: 2,
      });
      room.cards[2] = ['3c', '4d', '5h']; // Only singles and a straight, no pairs

      const analysis = analyzeHand(room.cards[2], room, 2);
      const pairs = analysis.validPlays.filter(p => p.detection.play === 'One Pair');

      expect(pairs.length).toBe(0);
    });

    it('rejects invalid detection plays', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [{ play: 'Singles', rank: 10 }, null, null, null],
        turnIndex: 2,
      });
      // Hand with only cards that can't beat rank 10
      room.cards[2] = ['3c', '4d'];

      const analysis = analyzeHand(room.cards[2], room, 2);
      const validSingles = analysis.validPlays.filter(p => p.detection.play === 'Singles');

      // Both 3 and 4 are below rank 10
      expect(validSingles.length).toBe(0);
    });
  });

  describe('consecutive pairs generation', () => {
    it('generates 3 consecutive pairs as bomb', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '3d', '4c', '4d', '5c', '5d', '6h'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const bombs = analysis.validPlays.filter(p => p.detection.play === 'Bomb');

      expect(bombs.length).toBeGreaterThan(0);
    });

    it('generates 4 consecutive pairs when available', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '3d', '4c', '4d', '5c', '5d', '6c', '6d', '7h'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const bombs = analysis.validPlays.filter(p => p.detection.play === 'Bomb');

      // Should have both 3-pair and 4-pair bombs
      expect(bombs.length).toBeGreaterThan(1);
    });

    it('does not generate consecutive pairs that include 2s', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['Kc', 'Kd', 'Ac', 'Ad', '2c', '2d']; // K, A, 2 are not consecutive for bomb

      const analysis = analyzeHand(room.cards[0], room, 0);
      const consecutivePairBombs = analysis.validPlays.filter(
        p => p.detection.play === 'Bomb' && p.cards.length === 6
      );

      expect(consecutivePairBombs.length).toBe(0);
    });

    it('requires pairs to be consecutive ranks', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '3d', '5c', '5d', '7c', '7d']; // Gap between pairs

      const analysis = analyzeHand(room.cards[0], room, 0);
      const consecutivePairBombs = analysis.validPlays.filter(
        p => p.detection.play === 'Bomb' && p.cards.length === 6
      );

      expect(consecutivePairBombs.length).toBe(0);
    });
  });

  describe('play types generated', () => {
    it('generates two pair', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '3d', '4c', '4d', '5h'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const twoPairs = analysis.validPlays.filter(p => p.detection.play === 'Two Pair');

      expect(twoPairs.length).toBeGreaterThan(0);
    });

    it('generates full house', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '3d', '3h', '4c', '4d'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const fullHouses = analysis.validPlays.filter(p => p.detection.play === 'Full House');

      expect(fullHouses.length).toBeGreaterThan(0);
    });

    it('generates flush', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '5c', '7c', '9c', 'Jc', 'Kd'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const flushes = analysis.validPlays.filter(p => p.detection.play === 'Flush');

      expect(flushes.length).toBeGreaterThan(0);
    });

    it('generates straight flush', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '4c', '5c', '6c', '7c', '8d'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const straightFlushes = analysis.validPlays.filter(p => p.detection.play === 'Straight Flush');

      expect(straightFlushes.length).toBeGreaterThan(0);
    });

    it('generates three of a kind', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '3d', '3h', '5s'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const triples = analysis.validPlays.filter(p => p.detection.play === 'Three of a Kind');

      expect(triples.length).toBeGreaterThan(0);
    });

    it('generates multiple pair combinations from 3+ of same rank', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      // 3 cards of same rank = 3 possible pairs (3c3d, 3c3h, 3d3h)
      room.cards[0] = ['3c', '3d', '3h'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const pairs = analysis.validPlays.filter(p => p.detection.play === 'One Pair');

      expect(pairs.length).toBe(3);
    });

    it('generates multiple triple combinations from 4 of same rank', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      // 4 cards of same rank = 4 possible triples
      room.cards[0] = ['3c', '3d', '3h', '3s'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const triples = analysis.validPlays.filter(p => p.detection.play === 'Three of a Kind');

      expect(triples.length).toBe(4);
    });

    it('generates straights with different suit combinations', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      // Multiple cards per face means multiple straight combinations
      room.cards[0] = ['3c', '3d', '4c', '5c'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const straights = analysis.validPlays.filter(p => p.detection.play === '3 Card Straight');

      // 3c-4c-5c and 3d-4c-5c
      expect(straights.length).toBe(2);
    });

    it('generates all two pair combinations', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      // 3 threes and 3 fours = multiple two pair combinations
      room.cards[0] = ['3c', '3d', '3h', '4c', '4d', '4h'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const twoPairs = analysis.validPlays.filter(p => p.detection.play === 'Two Pair');

      // 3 choose 2 pairs from 3s * 3 choose 2 pairs from 4s = 3 * 3 = 9
      expect(twoPairs.length).toBe(9);
    });

    it('generates all full house combinations', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '3d', '3h', '4c', '4d', '4h'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const fullHouses = analysis.validPlays.filter(p => p.detection.play === 'Full House');

      // With 3 threes and 3 fours:
      // 1 triple from 3s * C(3,2)=3 pairs from 4s = 3 full houses
      // 1 triple from 4s * C(3,2)=3 pairs from 3s = 3 full houses
      // Total = 6 full houses
      expect(fullHouses.length).toBe(6);
    });
  });

  describe('edge cases', () => {
    it('handles empty hand', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = [];

      const analysis = analyzeHand(room.cards[0], room, 0);
      expect(analysis.validPlays.length).toBe(0);
    });

    it('handles single card hand', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      expect(analysis.validPlays.length).toBe(1);
      expect(analysis.validPlays[0].detection.play).toBe('Singles');
    });

    it('handles long straights (up to 12 cards)', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['3c', '4d', '5h', '6s', '7c', '8d', '9h', 'Tc', 'Jd', 'Qh', 'Ks', 'Ac'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const longStraights = analysis.validPlays.filter(
        p => p.detection.play === '12 Card Straight'
      );

      expect(longStraights.length).toBeGreaterThan(0);
    });

    it('excludes 2s from straights', () => {
      const room = createGameRoom(2, {
        initial: false,
        last: [null, null, null, null],
      });
      room.cards[0] = ['Kc', 'Ad', '2h'];

      const analysis = analyzeHand(room.cards[0], room, 0);
      const straights = analysis.validPlays.filter(p => p.detection.play.includes('Straight'));

      expect(straights.length).toBe(0);
    });
  });
});
