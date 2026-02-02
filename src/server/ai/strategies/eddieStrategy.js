import { BaseStrategy } from './baseStrategy.js';

/**
 * Eddie - Aggressive Strategy
 * - Never voluntarily passes
 * - Prefers multi-card plays to get rid of cards faster
 * - Will use bombs and 2s readily
 * - Fast player: 0.5-1.5s delay
 */
export class EddieStrategy extends BaseStrategy {
  constructor() {
    super('eddie');
    this.minDelay = 500;
    this.maxDelay = 1500;
  }

  shouldPass(analysis, room, seatIndex) {
    // Eddie never voluntarily passes
    return false;
  }

  filterPlays(plays, analysis, room, seatIndex) {
    // Eddie doesn't filter - he'll play anything
    return plays;
  }

  selectFromFiltered(filtered, analysis, room, seatIndex) {
    // Eddie prefers plays that use more cards (to empty hand faster)
    // But also considers cost

    // Group plays by card count
    const byCount = new Map();
    for (const play of filtered) {
      const count = play.cards.length;
      if (!byCount.has(count)) {
        byCount.set(count, []);
      }
      byCount.get(count).push(play);
    }

    // Prefer multi-card plays if available
    const counts = Array.from(byCount.keys()).sort((a, b) => b - a); // Descending

    for (const count of counts) {
      if (count >= 2) {
        // Prefer pairs, triples, etc over singles
        const playsOfThisCount = byCount.get(count);
        // Return lowest cost play of this count
        return playsOfThisCount[0];
      }
    }

    // Fall back to lowest cost overall
    return filtered[0];
  }
}
