import { BaseStrategy } from './baseStrategy.js';

/**
 * Grandma Liu - Conservative Strategy
 * - Passes often to save high cards
 * - Prefers singles and low-cost plays
 * - Uses bombs only when necessary
 * - Slow, thoughtful: 2-4s delay
 */
export class GrandmaLiuStrategy extends BaseStrategy {
  constructor() {
    super('grandmaliu');
    this.minDelay = 2000;
    this.maxDelay = 4000;
  }

  shouldPass(analysis, room, seatIndex) {
    // Never pass on free play
    if (analysis.isFreePlay) return false;

    // Must play if opponent is very low (2 or fewer cards)
    if (this.isAnyOpponentLow(room, seatIndex, 2)) return false;

    if (analysis.validPlays.length === 0) return true;

    const bestPlay = analysis.validPlays[0];

    // Always pass rather than use a bomb (unless opponent is low)
    if (this.isBomb(bestPlay)) {
      return true;
    }

    // Very likely to pass if would use a 2
    if (this.countTwos(bestPlay.cards) > 0) {
      return Math.random() < 0.7; // 70% pass
    }

    // Likely to pass if would use an Ace
    if (bestPlay.cards.some(c => c[0] === 'A')) {
      return Math.random() < 0.5; // 50% pass
    }

    // Moderate chance to pass otherwise
    return Math.random() < 0.25; // 25% pass
  }

  filterPlays(plays, analysis, room, seatIndex) {
    const opponentLow = this.isAnyOpponentLow(room, seatIndex, 2);

    // If opponent is about to win, use everything
    if (opponentLow) {
      return plays;
    }

    // Grandma strongly prefers singles and pairs
    // Avoid bombs unless necessary
    const preferred = plays.filter(play => {
      if (this.isBomb(play)) return false;
      // Prefer smaller plays
      if (play.cards.length <= 2) return true;
      // Allow other plays if they're low cards
      if (this.isLowCardPlay(play)) return true;
      return false;
    });

    return preferred.length > 0 ? preferred : plays;
  }

  selectFromFiltered(filtered, analysis, room, seatIndex) {
    // Grandma prefers singles when possible
    const singles = filtered.filter(p => p.detection.play === 'Singles');
    if (singles.length > 0) {
      return singles[0]; // Lowest cost single
    }

    // Then pairs
    const pairs = filtered.filter(p => p.detection.play === 'One Pair');
    if (pairs.length > 0) {
      return pairs[0];
    }

    // Otherwise lowest cost
    return filtered[0];
  }
}
