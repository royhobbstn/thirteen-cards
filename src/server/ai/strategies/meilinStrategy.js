import { BaseStrategy } from './baseStrategy.js';
import { getFaceValue } from '../cardEvaluator.js';

/**
 * Mei-Lin - Endgame Specialist Strategy
 * - Three phases: Early (conserve), Mid (position), Endgame (dominate)
 * - Sheds low cards early while preserving options
 * - Shifts to aggressive mode when anyone is close to winning
 * - Delay: 1.5-3.0s (measured, patient)
 */
export class MeiLinStrategy extends BaseStrategy {
  constructor() {
    super('meilin');
    this.minDelay = 1500;
    this.maxDelay = 3000;
  }

  /**
   * Determine game phase based on hand size and opponent states
   * Returns 'early', 'mid', or 'endgame'
   */
  getGamePhase(hand, room, seatIndex) {
    const handSize = hand.length;

    // Force endgame if any opponent is very low
    if (this.isAnyOpponentLow(room, seatIndex, 3)) {
      return 'endgame';
    }

    // Phase by own hand size
    if (handSize >= 9) return 'early';
    if (handSize >= 5) return 'mid';
    return 'endgame';
  }

  /**
   * Check if a play uses only low cards (value < 8)
   */
  isLowValuePlay(play) {
    return play.cards.every((c) => getFaceValue(c) < 8);
  }

  shouldPass(analysis, room, seatIndex) {
    if (analysis.isFreePlay) return false;

    const hand = room.cards[seatIndex];
    const phase = this.getGamePhase(hand, room, seatIndex);

    if (analysis.validPlays.length === 0) return true;

    const bestPlay = analysis.validPlays[0];

    switch (phase) {
      case 'early':
        // Pass often to conserve resources
        if (this.isBomb(bestPlay)) return true;
        if (this.countTwos(bestPlay.cards) > 0) return true;
        if (!this.isLowValuePlay(bestPlay)) {
          return Math.random() < 0.5;
        }
        return Math.random() < 0.35;

      case 'mid':
        // Moderate passing
        if (this.isBomb(bestPlay)) {
          return Math.random() < 0.6;
        }
        if (this.countTwos(bestPlay.cards) > 0) {
          return Math.random() < 0.4;
        }
        return Math.random() < 0.2;

      case 'endgame':
        // Never voluntarily pass - fight for every board
        return false;
    }

    return Math.random() < 0.2;
  }

  filterPlays(plays, analysis, room, seatIndex) {
    const hand = room.cards[seatIndex];
    const phase = this.getGamePhase(hand, room, seatIndex);

    switch (phase) {
      case 'early':
        // Only allow low-value plays
        const lowPlays = plays.filter((p) => {
          if (this.isBomb(p)) return false;
          if (this.countTwos(p.cards) > 0) return false;
          if (this.countHighCards(p.cards) > 0) return false;
          return this.isLowValuePlay(p);
        });
        return lowPlays.length > 0 ? lowPlays : plays.slice(0, 3);

      case 'mid':
        // Allow low and mid-range cards
        const midPlays = plays.filter((p) => {
          if (this.isBomb(p)) return false;
          if (this.countTwos(p.cards) > 0) return false;
          return true;
        });
        return midPlays.length > 0 ? midPlays : plays;

      case 'endgame':
        // No filtering - use everything to win
        return plays;
    }

    return plays;
  }

  selectFromFiltered(filtered, analysis, room, seatIndex) {
    const hand = room.cards[seatIndex];
    const phase = this.getGamePhase(hand, room, seatIndex);

    switch (phase) {
      case 'early':
        // Strictly lowest cost to shed cheap cards
        return filtered[0];

      case 'mid':
        // Balance shedding with maintaining options
        // Prefer plays that don't break pairs/triples
        const singles = filtered.filter((p) => p.detection.play === 'Singles');
        if (singles.length > 0) {
          return singles[0];
        }
        return filtered[0];

      case 'endgame':
        // Prefer multi-card plays to finish faster
        const multiCard = filtered.filter((p) => p.cards.length >= 2);
        if (multiCard.length > 0) {
          // Sort by cards count descending
          multiCard.sort((a, b) => b.cards.length - a.cards.length);
          return multiCard[0];
        }

        // If opponent has 1-2 cards and we have bomb, use it
        if (this.isAnyOpponentLow(room, seatIndex, 2)) {
          const bombs = filtered.filter((p) => this.isBomb(p));
          if (bombs.length > 0) {
            return bombs[0];
          }
        }

        return filtered[0];
    }

    return filtered[0];
  }
}
