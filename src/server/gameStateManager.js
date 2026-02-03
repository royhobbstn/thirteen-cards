/**
 * Game State Manager
 * Pure functions for managing game state initialization and transitions
 */

import Deck from 'card-deck';
import { orderedCards, cardRank } from '../cardUtils/cards.js';

/**
 * Deal cards to players
 * @param {number} numPlayers - Number of players to deal to (2-4)
 * @param {number[]} seatPositions - Array of seat indices that have players
 * @returns {object} Object with { hands: array of hands per seat, deck: the deck used }
 */
export function dealCards(numPlayers, seatPositions) {
  const deck = new Deck(JSON.parse(JSON.stringify(orderedCards)));
  deck.shuffle();

  const hands = [null, null, null, null];

  for (const seatIndex of seatPositions) {
    hands[seatIndex] = [...deck.draw(13)].sort((a, b) => cardRank[b] - cardRank[a]);
  }

  return { hands, deck };
}

/**
 * Determine which player goes first (has lowest card)
 * @param {Array[]} cards - Array of hands per seat (null for empty seats)
 * @returns {object} Object with { turnIndex: seat index, lowestCard: card id }
 */
export function determineFirstPlayer(cards) {
  let lowestRank = 53;
  let turnIndex = null;
  let lowestCard = null;

  for (let i = 0; i < cards.length; i++) {
    const hand = cards[i];
    if (hand !== null && hand.length > 0) {
      // Cards are sorted high to low, so last card is lowest
      const lowCard = hand[hand.length - 1];
      const rank = cardRank[lowCard];
      if (rank < lowestRank) {
        lowestRank = rank;
        turnIndex = i;
        lowestCard = lowCard;
      }
    }
  }

  return { turnIndex, lowestCard };
}

/**
 * Initialize a new game state
 * @param {object} room - Existing room state
 * @returns {object} Updated room state ready for game
 */
export function initializeGameState(room) {
  // Find which seats have players
  const seatPositions = [];
  room.seated.forEach((seat, index) => {
    if (seat !== null) {
      seatPositions.push(index);
    }
  });

  // Deal cards
  const { hands } = dealCards(seatPositions.length, seatPositions);

  // Determine first player
  const { turnIndex, lowestCard } = determineFirstPlayer(hands);

  return {
    ...room,
    cards: hands,
    turnIndex,
    lowest: lowestCard,
    startingPlayers: seatPositions.length,
    initial: true,
    board: [],
    rank: [null, null, null, null],
    last: [null, null, null, null],
    lastPassSeat: null,
    submitted: [],
  };
}

/**
 * Reset room state for a new game (Play Again)
 * @param {object} room - Current room state
 * @returns {object} Reset room state
 */
export function resetRoomForNewGame(room) {
  return {
    ...room,
    stage: 'seating',
    rank: [null, null, null, null],
    cards: [null, null, null, null],
    submitted: [],
    last: [null, null, null, null],
    lastPassSeat: null,
    initial: true,
    lowest: null,
    turnIndex: 0,
    board: [],
    gameId: 0,
    // Clean up disconnected seats
    seated: room.seated.map(seat => (seat === 'disconnected' ? null : seat)),
  };
}
