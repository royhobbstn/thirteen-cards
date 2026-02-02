import { BaseStrategy } from './baseStrategy.js';

/**
 * Marcus - Balanced Strategy
 * - Plays lowest-cost options first
 * - Saves bombs and 2s unless opponent is low on cards
 * - Moderate pass rate
 * - Delay: 1.5-3s
 */
export class MarcusStrategy extends BaseStrategy {
  constructor() {
    super('marcus');
    this.minDelay = 1500;
    this.maxDelay = 3000;
  }

  shouldPass(analysis, room, seatIndex) {
    // Never pass on free play
    if (analysis.isFreePlay) return false;

    // Don't pass if opponent is low
    if (this.isAnyOpponentLow(room, seatIndex, 3)) return false;

    // Small chance to pass to save cards (10%)
    if (analysis.validPlays.length > 0) {
      const bestPlay = analysis.validPlays[0];

      // More likely to pass if best option uses high cards
      if (this.countTwos(bestPlay.cards) > 0) {
        return Math.random() < 0.3; // 30% pass if would use 2
      }
      if (this.isBomb(bestPlay)) {
        return Math.random() < 0.4; // 40% pass if would use bomb
      }
    }

    return Math.random() < 0.1; // 10% random pass
  }

  filterPlays(plays, analysis, room, seatIndex) {
    const opponentLow = this.isAnyOpponentLow(room, seatIndex, 3);

    // If opponent is low, don't filter - use whatever beats the board
    if (opponentLow) {
      return plays;
    }

    // Otherwise, try to avoid using bombs and 2s early
    const conservative = plays.filter(play => {
      if (this.isBomb(play)) return false;
      if (this.countTwos(play.cards) > 0) return false;
      return true;
    });

    // Return conservative options if available, otherwise all options
    return conservative.length > 0 ? conservative : plays;
  }

  selectFromFiltered(filtered, analysis, room, seatIndex) {
    // Marcus plays the lowest cost option (already sorted)
    return filtered[0];
  }
}
