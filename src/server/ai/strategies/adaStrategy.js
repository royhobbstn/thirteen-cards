import { BaseStrategy } from './baseStrategy.js';
import { getFaceValue } from '../cardEvaluator.js';

/**
 * Professor Ada - Mathematical Optimizer Strategy
 * - Calculates efficiency for every play
 * - Minimizes random decisions, prefers calculated choices
 * - Considers card value vs board value
 * - Preserves winning sequences
 * - Delay: 2.5-4.5s (complex calculations)
 */
export class AdaStrategy extends BaseStrategy {
  constructor() {
    super('ada');
    this.minDelay = 2500;
    this.maxDelay = 4500;
  }

  /**
   * Calculate average value of cards in a play
   */
  getPlayValue(play) {
    const total = play.cards.reduce((sum, c) => sum + getFaceValue(c), 0);
    return total / play.cards.length;
  }

  /**
   * Calculate efficiency: cards played per unit of value spent
   */
  getEfficiency(play) {
    const value = this.getPlayValue(play);
    return play.cards.length / value;
  }

  /**
   * Check if remaining cards form unbeatable sequence
   */
  hasGuaranteedSequence(hand) {
    // Simple check: if we have only 2s left, we likely win
    const twos = hand.filter((c) => c[0] === '2');
    if (twos.length === hand.length && hand.length <= 3) {
      return true;
    }

    // If we have a bomb and only a few other cards
    if (hand.length <= 5) {
      // Check for 4 of a kind
      const byFace = {};
      for (const c of hand) {
        const face = c[0];
        byFace[face] = (byFace[face] || 0) + 1;
      }
      const hasFourOfKind = Object.values(byFace).some((count) => count === 4);
      if (hasFourOfKind && hand.length <= 5) {
        return true;
      }
    }

    return false;
  }

  shouldPass(analysis, room, seatIndex) {
    if (analysis.isFreePlay) return false;

    const hand = room.cards[seatIndex];

    // Never pass if we have guaranteed winning sequence
    if (this.hasGuaranteedSequence(hand)) {
      return false;
    }

    if (this.isAnyOpponentLow(room, seatIndex, 2)) return false;

    if (analysis.validPlays.length === 0) return true;

    const bestPlay = analysis.validPlays[0];
    const boardValue = analysis.lastPlay?.rank || 0;
    const playValue = this.getPlayValue(bestPlay);

    // Calculate "pass value" - is keeping cards worth losing board control?
    // Pass if play uses high-value cards to beat low-value board
    if (playValue > 15 && boardValue < 8) {
      return true;
    }

    // More conservative with many cards remaining
    if (hand.length > 8 && !this.isAnyOpponentLow(room, seatIndex, 5)) {
      if (this.countTwos(bestPlay.cards) > 0) {
        return true; // Save 2s in early game
      }
      // Pass if efficiency is poor (calculated, not random)
      const efficiency = this.getEfficiency(bestPlay);
      if (efficiency < 0.3) {
        return true;
      }
    }

    // Small pass rate for board control evaluation
    // Based on hand strength rather than pure randomness
    const handStrength = hand.length / 13; // Normalize to 0-1
    return handStrength > 0.5 && playValue > 10;
  }

  filterPlays(plays, analysis, room, seatIndex) {
    const opponentLow = this.isAnyOpponentLow(room, seatIndex, 3);
    if (opponentLow) return plays;

    // Filter by efficiency threshold
    const efficientPlays = plays.filter((play) => {
      const eff = this.getEfficiency(play);
      return eff >= 0.15; // Minimum efficiency threshold
    });

    // Never use bombs unless opponent is very low or it's the only play
    const nonBombPlays = efficientPlays.filter((p) => !this.isBomb(p));

    // Preserve 2s unless it beats an opponent's 2
    const preserve2s = nonBombPlays.filter((p) => {
      if (this.countTwos(p.cards) === 0) return true;
      // Only use 2 if board has high cards
      return analysis.lastPlay && analysis.lastPlay.rank >= 12;
    });

    if (preserve2s.length > 0) return preserve2s;
    if (nonBombPlays.length > 0) return nonBombPlays;
    if (efficientPlays.length > 0) return efficientPlays;
    return plays;
  }

  selectFromFiltered(filtered, analysis, room, seatIndex) {
    // Never random - calculate composite score for each play
    let bestPlay = filtered[0];
    let bestScore = -Infinity;

    for (const play of filtered) {
      let score = 0;

      // Factor 1: Cards eliminated (more is better)
      score += play.cards.length * 10;

      // Factor 2: Efficiency (higher is better)
      score += this.getEfficiency(play) * 20;

      // Factor 3: Low cost is better
      score -= play.score * 0.5;

      // Factor 4: Avoid using 2s
      score -= this.countTwos(play.cards) * 15;

      // Factor 5: Avoid bombs unless necessary
      if (this.isBomb(play)) {
        score -= 30;
      }

      if (score > bestScore) {
        bestScore = score;
        bestPlay = play;
      }
    }

    return bestPlay;
  }
}
