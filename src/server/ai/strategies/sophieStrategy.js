import { BaseStrategy } from './baseStrategy.js';
import { faceRank } from '../../../cardUtils/cards.js';

/**
 * Sophie - Straight Specialist Strategy
 * - Prefers straights over other play types
 * - Builds and protects sequence potential
 * - Plays longest straights available
 * - Delay: 1.2-2.5s (pattern recognition)
 */
export class SophieStrategy extends BaseStrategy {
  constructor() {
    super('sophie');
    this.minDelay = 1200;
    this.maxDelay = 2500;
  }

  /**
   * Group hand by face
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
   * Find cards that are part of consecutive sequences of 3+
   */
  findSequenceCards(hand) {
    const byFace = this.groupByFace(hand);
    const faces = Object.keys(byFace)
      .filter((f) => f !== '2') // Exclude 2s from straights
      .sort((a, b) => faceRank[a] - faceRank[b]);

    const sequenceCards = new Set();

    // Find runs of 3+ consecutive faces
    let runStart = 0;
    for (let i = 1; i <= faces.length; i++) {
      const isConsecutive =
        i < faces.length && faceRank[faces[i]] === faceRank[faces[i - 1]] + 1;

      if (!isConsecutive) {
        const runLength = i - runStart;
        if (runLength >= 3) {
          // Mark all cards in this run as sequence cards
          for (let j = runStart; j < i; j++) {
            byFace[faces[j]].forEach((c) => sequenceCards.add(c));
          }
        }
        runStart = i;
      }
    }

    return Array.from(sequenceCards);
  }

  /**
   * Get cards that aren't part of any sequence
   */
  getOrphanCards(hand) {
    const sequenceCards = new Set(this.findSequenceCards(hand));
    return hand.filter((c) => !sequenceCards.has(c));
  }

  /**
   * Check if a play is a straight
   */
  isStraight(play) {
    return (
      play.detection.play.includes('Straight') &&
      !play.detection.play.includes('Flush')
    );
  }

  /**
   * Check if a play is a straight flush
   */
  isStraightFlush(play) {
    return play.detection.play === 'Straight Flush';
  }

  shouldPass(analysis, room, seatIndex) {
    if (analysis.isFreePlay) return false;
    if (this.isAnyOpponentLow(room, seatIndex, 3)) return false;

    if (analysis.validPlays.length === 0) return true;

    const bestPlay = analysis.validPlays[0];

    // Never pass if we have a long straight (4+ cards are high-value)
    // 3-card straights are protected by sequence logic below but can be passed
    if (this.isStraight(bestPlay) && bestPlay.cards.length >= 4) {
      return false;
    }

    // Never pass on straight flush
    if (this.isStraightFlush(bestPlay)) {
      return false;
    }

    const hand = room.cards[seatIndex];
    const sequenceCards = this.findSequenceCards(hand);

    // Pass if best play would break sequence potential
    if (sequenceCards.length >= 3) {
      const usesSequenceCards = bestPlay.cards.some((c) =>
        sequenceCards.includes(c)
      );
      if (usesSequenceCards && !this.isStraight(bestPlay)) {
        return Math.random() < 0.55;
      }
    }

    return Math.random() < 0.2;
  }

  filterPlays(plays, analysis, room, seatIndex) {
    const opponentLow = this.isAnyOpponentLow(room, seatIndex, 3);
    if (opponentLow) return plays;

    const hand = room.cards[seatIndex];
    const orphanCards = this.getOrphanCards(hand);

    // Strongly prefer straights and straight flushes
    const straights = plays.filter(
      (p) => this.isStraight(p) || this.isStraightFlush(p)
    );

    if (straights.length > 0) {
      return straights;
    }

    // Next, prefer plays using orphan cards (not part of sequences)
    const orphanPlays = plays.filter((play) =>
      play.cards.every((c) => orphanCards.includes(c))
    );

    if (orphanPlays.length > 0) {
      return orphanPlays;
    }

    // Avoid plays that use sequence cards unless necessary
    const sequenceCards = this.findSequenceCards(hand);
    const nonSequencePlays = plays.filter(
      (play) => !play.cards.some((c) => sequenceCards.includes(c))
    );

    return nonSequencePlays.length > 0 ? nonSequencePlays : plays;
  }

  selectFromFiltered(filtered, analysis, room, seatIndex) {
    // Prioritize straight flushes
    const straightFlushes = filtered.filter((p) => this.isStraightFlush(p));
    if (straightFlushes.length > 0) {
      // Pick longest, then lowest ranked
      straightFlushes.sort((a, b) => {
        if (b.cards.length !== a.cards.length) {
          return b.cards.length - a.cards.length;
        }
        return a.score - b.score;
      });
      return straightFlushes[0];
    }

    // Then regular straights - prefer longest
    const straights = filtered.filter((p) => this.isStraight(p));
    if (straights.length > 0) {
      straights.sort((a, b) => {
        if (b.cards.length !== a.cards.length) {
          return b.cards.length - a.cards.length;
        }
        return a.score - b.score;
      });
      return straights[0];
    }

    // For non-straights, prefer singles to preserve pair potential
    const singles = filtered.filter((p) => p.detection.play === 'Singles');
    if (singles.length > 0) {
      return singles[0];
    }

    return filtered[0];
  }
}
