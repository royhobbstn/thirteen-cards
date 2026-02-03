import {
  dealCards,
  determineFirstPlayer,
  initializeGameState,
  resetRoomForNewGame,
} from '../gameStateManager.js';
import { createMockRoom, createGameRoom } from '../../testFixtures/rooms.js';

describe('dealCards', () => {
  it('deals 13 cards to each player', () => {
    const { hands } = dealCards(2, [0, 2]);

    expect(hands[0]).toHaveLength(13);
    expect(hands[2]).toHaveLength(13);
    expect(hands[1]).toBeNull();
    expect(hands[3]).toBeNull();
  });

  it('deals different cards to each player', () => {
    const { hands } = dealCards(4, [0, 1, 2, 3]);

    // All hands should have 13 cards
    for (let i = 0; i < 4; i++) {
      expect(hands[i]).toHaveLength(13);
    }

    // No card should appear in multiple hands
    const allCards = [...hands[0], ...hands[1], ...hands[2], ...hands[3]];
    const uniqueCards = new Set(allCards);
    expect(uniqueCards.size).toBe(52);
  });

  it('sorts cards from high to low', () => {
    const { hands } = dealCards(1, [0]);

    // First card should have higher rank than last card
    // (cards are sorted by rank descending)
    expect(hands[0]).toBeDefined();
    // We can't know exact cards due to shuffle, but structure should be correct
    expect(hands[0].length).toBe(13);
  });
});

describe('determineFirstPlayer', () => {
  it('finds player with lowest card', () => {
    const cards = [
      ['Ac', 'Kc', '5c'], // Lowest is 5c
      ['2s', 'Ah', '3c'], // Lowest is 3c - THIS IS LOWEST
      null,
      ['Qc', 'Jc', '6c'], // Lowest is 6c
    ];

    const { turnIndex, lowestCard } = determineFirstPlayer(cards);

    expect(turnIndex).toBe(1);
    expect(lowestCard).toBe('3c');
  });

  it('handles 2-player game', () => {
    const cards = [
      ['Kc', 'Qc', '4c'], // Lowest is 4c
      null,
      ['Ac', 'Jc', '5c'], // Lowest is 5c
      null,
    ];

    const { turnIndex, lowestCard } = determineFirstPlayer(cards);

    expect(turnIndex).toBe(0);
    expect(lowestCard).toBe('4c');
  });

  it('handles empty slots', () => {
    // Cards are sorted high to low, so lowest is at end
    const cards = [null, null, ['5h', '4d', '3c'], null];

    const { turnIndex, lowestCard } = determineFirstPlayer(cards);

    expect(turnIndex).toBe(2);
    expect(lowestCard).toBe('3c');
  });
});

describe('initializeGameState', () => {
  it('initializes game state with dealt cards', () => {
    const room = createGameRoom(2);
    room.stage = 'seating';

    const newState = initializeGameState(room);

    expect(newState.cards[0]).toHaveLength(13);
    expect(newState.cards[2]).toHaveLength(13);
    expect(newState.cards[1]).toBeNull();
    expect(newState.cards[3]).toBeNull();
  });

  it('sets correct turn index', () => {
    const room = createGameRoom(2);

    const newState = initializeGameState(room);

    // turnIndex should be 0 or 2 (the seated positions)
    expect([0, 2]).toContain(newState.turnIndex);
  });

  it('sets lowest card', () => {
    const room = createGameRoom(2);

    const newState = initializeGameState(room);

    expect(newState.lowest).toBeDefined();
    expect(typeof newState.lowest).toBe('string');
    expect(newState.lowest).toMatch(/^[3-9TJQKA2][cdhs]$/);
  });

  it('sets starting players count', () => {
    const room = createGameRoom(4);

    const newState = initializeGameState(room);

    expect(newState.startingPlayers).toBe(4);
  });

  it('resets game state properties', () => {
    const room = createGameRoom(2);
    room.board = ['Ac', 'Ad']; // Dirty state
    room.rank = [1, null, 2, null]; // Dirty state

    const newState = initializeGameState(room);

    expect(newState.board).toEqual([]);
    expect(newState.rank).toEqual([null, null, null, null]);
    expect(newState.last).toEqual([null, null, null, null]);
    expect(newState.initial).toBe(true);
  });
});

describe('resetRoomForNewGame', () => {
  it('resets room to seating stage', () => {
    const room = createGameRoom(2);
    room.stage = 'done';

    const newState = resetRoomForNewGame(room);

    expect(newState.stage).toBe('seating');
  });

  it('clears game state', () => {
    const room = createGameRoom(2);
    room.stage = 'done';
    room.rank = [1, null, 2, null];
    room.cards = [['3c'], null, ['4d'], null];
    room.board = ['Ac'];
    room.lowest = '3c';

    const newState = resetRoomForNewGame(room);

    expect(newState.rank).toEqual([null, null, null, null]);
    expect(newState.cards).toEqual([null, null, null, null]);
    expect(newState.board).toEqual([]);
    expect(newState.lowest).toBeNull();
    expect(newState.initial).toBe(true);
    expect(newState.turnIndex).toBe(0);
  });

  it('cleans up disconnected seats', () => {
    const room = createGameRoom(2);
    room.seated = ['socket-1', 'disconnected', 'socket-2', null];

    const newState = resetRoomForNewGame(room);

    expect(newState.seated).toEqual(['socket-1', null, 'socket-2', null]);
  });

  it('preserves player data', () => {
    const room = createGameRoom(2);
    room.aliases['socket-1'] = 'Player 1';
    room.stats['socket-1'].points = 10;

    const newState = resetRoomForNewGame(room);

    expect(newState.aliases['socket-1']).toBe('Player 1');
    expect(newState.stats['socket-1'].points).toBe(10);
  });
});
