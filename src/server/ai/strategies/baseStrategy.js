import { isTwo, isHighCard } from '../cardEvaluator.js';

/**
 * Base strategy class with shared utilities
 * Subclasses override choosePlay() and shouldPass()
 */
export class BaseStrategy {
  constructor(name) {
    this.name = name;
  }

  /**
   * Choose a play from the analysis results
   * @param {object} analysis - Result from analyzeHand()
   * @param {object} room - Room state
   * @param {number} seatIndex - AI's seat index
   * @returns {object|null} Play object or null to pass
   */
  choosePlay(analysis, room, seatIndex) {
    if (analysis.validPlays.length === 0) {
      return null; // Must pass
    }

    // Check if we should voluntarily pass
    if (!analysis.isFreePlay && this.shouldPass(analysis, room, seatIndex)) {
      return null;
    }

    // Filter plays based on strategy preferences
    const filtered = this.filterPlays(analysis.validPlays, analysis, room, seatIndex);

    if (filtered.length === 0) {
      // If filtering removed everything, fall back to lowest cost play
      return analysis.validPlays[0];
    }

    return this.selectFromFiltered(filtered, analysis, room, seatIndex);
  }

  /**
   * Whether to voluntarily pass (even if we can play)
   * Override in subclasses
   */
  shouldPass(analysis, room, seatIndex) {
    return false;
  }

  /**
   * Filter plays based on strategy-specific criteria
   * Override in subclasses
   */
  filterPlays(plays, analysis, room, seatIndex) {
    return plays;
  }

  /**
   * Select final play from filtered options
   * Override in subclasses for different selection logic
   */
  selectFromFiltered(filtered, analysis, room, seatIndex) {
    return filtered[0]; // Default: lowest cost
  }

  // Utility methods

  /**
   * Get count of cards remaining for each opponent
   */
  getOpponentCardCounts(room, seatIndex) {
    const counts = [];
    for (let i = 0; i < 4; i++) {
      if (i === seatIndex) continue;
      if (!room.seated[i] || room.rank[i]) continue; // Empty or finished
      counts.push({
        seatIndex: i,
        count: room.cards[i] ? room.cards[i].length : 0,
      });
    }
    return counts;
  }

  /**
   * Check if any opponent is close to winning
   */
  isAnyOpponentLow(room, seatIndex, threshold = 3) {
    const counts = this.getOpponentCardCounts(room, seatIndex);
    return counts.some(c => c.count <= threshold && c.count > 0);
  }

  /**
   * Count how many 2s are in a play
   */
  countTwos(cards) {
    return cards.filter(c => isTwo(c)).length;
  }

  /**
   * Count high cards (A, 2) in a play
   */
  countHighCards(cards) {
    return cards.filter(c => isHighCard(c)).length;
  }

  /**
   * Check if play is a bomb
   */
  isBomb(play) {
    return play.detection.play === 'Bomb';
  }

  /**
   * Check if play uses only low cards (below 10)
   */
  isLowCardPlay(play) {
    const lowFaces = ['3', '4', '5', '6', '7', '8', '9'];
    return play.cards.every(c => lowFaces.includes(c[0]));
  }
}
