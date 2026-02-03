import { BaseStrategy } from './baseStrategy.js';

/**
 * Uncle Frank - Psychological Strategy
 * - Variable timing to confuse opponents
 * - Strategic "trap" passes when strong
 * - Occasional power plays to intimidate
 * - Unpredictable selection patterns
 * - Delay: 1.0-4.0s (variable)
 */
export class FrankStrategy extends BaseStrategy {
  constructor() {
    super('frank');
    this.minDelay = 1000;
    this.maxDelay = 4000;
  }

  /**
   * Check if we have strong cards (2s or bombs)
   */
  hasStrongHand(analysis, hand) {
    const hasBomb = analysis.validPlays.some((p) => this.isBomb(p));
    const twoCount = this.countTwos(hand);
    return hasBomb || twoCount >= 2;
  }

  /**
   * Find the next active player (skipping empty/finished seats)
   */
  findNextActivePlayer(room, seatIndex) {
    for (let i = 1; i <= 4; i++) {
      const nextSeat = (seatIndex + i) % 4;
      // Check if seat is occupied and player hasn't finished
      if (room.seated[nextSeat] && !room.rank[nextSeat]) {
        return nextSeat;
      }
    }
    return null;
  }

  shouldPass(analysis, room, seatIndex) {
    if (analysis.isFreePlay) return false;
    if (this.isAnyOpponentLow(room, seatIndex, 2)) return false;

    if (analysis.validPlays.length === 0) return true;

    const hand = room.cards[seatIndex];
    const bestPlay = analysis.validPlays[0];

    // "Trap pass" - when holding strong hand, sometimes pass to bait
    if (this.hasStrongHand(analysis, hand)) {
      // More likely to trap if board is moderate (not high cards)
      const boardIsModerate = analysis.lastPlay && analysis.lastPlay.rank < 10;
      if (boardIsModerate) {
        return Math.random() < 0.45;
      }
    }

    // Wait for better moment if only have bomb/2 to play
    if (this.isBomb(bestPlay) || this.countTwos(bestPlay.cards) > 0) {
      return Math.random() < 0.5;
    }

    // Check if next active player is close to winning - never let them get free play
    const counts = this.getOpponentCardCounts(room, seatIndex);
    // Find next active player (might not be adjacent seat if some players finished)
    const nextActivePlayer = this.findNextActivePlayer(room, seatIndex);
    if (nextActivePlayer !== null) {
      const nextPlayerCount = counts.find((c) => c.seatIndex === nextActivePlayer);
      if (nextPlayerCount && nextPlayerCount.count <= 3) {
        return false; // Don't give them free play
      }
    }

    // Random chaos factor - sometimes pass for no reason
    if (Math.random() < 0.1) {
      return true;
    }

    return Math.random() < 0.15;
  }

  filterPlays(plays, analysis, room, seatIndex) {
    const opponentLow = this.isAnyOpponentLow(room, seatIndex, 3);
    if (opponentLow) return plays;

    // Occasional "flex play" - play stronger than needed (10% chance)
    if (Math.random() < 0.1 && plays.length > 3) {
      // Return only middle-to-high cost plays
      const midPoint = Math.floor(plays.length / 2);
      return plays.slice(midPoint);
    }

    // Usually avoid 2s unless it's a show of force after passes
    const without2s = plays.filter((p) => this.countTwos(p.cards) === 0);
    if (without2s.length > 0) {
      return without2s;
    }

    return plays;
  }

  selectFromFiltered(filtered, analysis, room, seatIndex) {
    // Variable selection for unpredictability
    const roll = Math.random();

    if (roll < 0.6) {
      // 60% - play lowest cost (efficient)
      return filtered[0];
    } else if (roll < 0.85) {
      // 25% - play mid-cost (unpredictable)
      const midIndex = Math.floor(filtered.length / 2);
      return filtered[Math.min(midIndex, filtered.length - 1)];
    } else {
      // 15% - power play (intimidation)
      return filtered[filtered.length - 1];
    }
  }
}
