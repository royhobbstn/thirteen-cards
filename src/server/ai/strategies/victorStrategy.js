import { BaseStrategy } from './baseStrategy.js';

/**
 * Victor - Bomb Collector Strategy
 * - Protects potential bombs (3-of-a-kinds)
 * - Saves bombs for critical moments
 * - Explosive finishes when opponent is low
 * - Delay: 1.8-3.5s (calculating)
 */
export class VictorStrategy extends BaseStrategy {
  constructor() {
    super('victor');
    this.minDelay = 1800;
    this.maxDelay = 3500;
  }

  /**
   * Group hand by face to analyze bomb potential
   */
  groupByFace(hand) {
    const groups = {};
    for (const card of hand) {
      const face = card[0];
      if (!groups[face]) groups[face] = [];
      groups[face].push(card);
    }
    return groups;
  }

  /**
   * Find faces where we have 3+ cards (bomb potential)
   */
  getBombPotentialFaces(hand) {
    const byFace = this.groupByFace(hand);
    return Object.entries(byFace)
      .filter(([face, cards]) => cards.length >= 3)
      .map(([face]) => face);
  }

  /**
   * Check if a play would break bomb potential
   * (uses 2+ cards from a 3-of-a-kind)
   */
  breaksBombPotential(play, hand) {
    const byFace = this.groupByFace(hand);
    const playByFace = this.groupByFace(play.cards);

    for (const [face, playCards] of Object.entries(playByFace)) {
      const handCount = byFace[face]?.length || 0;
      // If we have 3-4 of this face and play uses 2+, we're breaking potential
      if (handCount >= 3 && playCards.length >= 2) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get cards that aren't part of any bomb potential
   */
  getOrphanCards(hand) {
    const byFace = this.groupByFace(hand);
    const orphans = [];
    for (const [face, cards] of Object.entries(byFace)) {
      if (cards.length < 3) {
        orphans.push(...cards);
      }
    }
    return orphans;
  }

  shouldPass(analysis, room, seatIndex) {
    if (analysis.isFreePlay) return false;
    if (this.isAnyOpponentLow(room, seatIndex, 2)) return false;

    if (analysis.validPlays.length === 0) return true;

    const hand = room.cards[seatIndex];
    const bestPlay = analysis.validPlays[0];
    const hasBombPotential = this.getBombPotentialFaces(hand).length > 0;
    const hasCompleteBomb = analysis.validPlays.some((p) => this.isBomb(p));

    // Pass often if best play breaks bomb potential
    if (this.breaksBombPotential(bestPlay, hand)) {
      return Math.random() < 0.6;
    }

    // If holding a complete bomb, sometimes pass to wait for right moment
    if (hasCompleteBomb && !this.isAnyOpponentLow(room, seatIndex, 4)) {
      return Math.random() < 0.4;
    }

    // Lower pass rate if no bomb potential to protect
    if (!hasBombPotential) {
      return Math.random() < 0.15;
    }

    return Math.random() < 0.25;
  }

  filterPlays(plays, analysis, room, seatIndex) {
    const opponentLow = this.isAnyOpponentLow(room, seatIndex, 3);

    // If opponent is low, allow everything including bombs
    if (opponentLow) {
      return plays;
    }

    const hand = room.cards[seatIndex];
    const orphanCards = this.getOrphanCards(hand);

    // Prefer plays using orphan cards
    const orphanPlays = plays.filter((play) => {
      if (this.isBomb(play)) return false; // Save bombs
      // Check if all cards in play are orphans
      return play.cards.every((c) => orphanCards.includes(c));
    });

    if (orphanPlays.length > 0) {
      return orphanPlays;
    }

    // Filter out plays that break bomb potential
    const safePlays = plays.filter((play) => {
      if (this.isBomb(play)) return false;
      return !this.breaksBombPotential(play, hand);
    });

    return safePlays.length > 0 ? safePlays : plays;
  }

  selectFromFiltered(filtered, analysis, room, seatIndex) {
    const opponentVeryLow = this.isAnyOpponentLow(room, seatIndex, 3);

    // If opponent is about to win and we have a bomb, use it
    if (opponentVeryLow) {
      const bombs = filtered.filter((p) => this.isBomb(p));
      if (bombs.length > 0) {
        // Use lowest-ranked bomb first (preserve high-value bombs for later)
        // Plays are sorted by cost ascending, so bombs[0] is lowest cost/rank
        return bombs[0];
      }
    }

    // Otherwise play lowest cost
    return filtered[0];
  }
}
