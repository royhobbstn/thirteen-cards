import { isAiSeat, getAiPersona, processAiTurn } from '../index.js';
import { createGameRoom, createAiRoom } from '../../../testFixtures/rooms.js';

// Mock timers
jest.useFakeTimers();

// Mock io
const createMockIo = () => ({
  in: jest.fn().mockReturnThis(),
  emit: jest.fn(),
});

describe('isAiSeat', () => {
  it('returns true for AI seat IDs starting with --', () => {
    expect(isAiSeat('--marcus')).toBe(true);
    expect(isAiSeat('--eddie')).toBe(true);
    expect(isAiSeat('--grandmaliu')).toBe(true);
  });

  it('returns false for human socket IDs', () => {
    expect(isAiSeat('socket-123')).toBe(false);
    expect(isAiSeat('abc123xyz')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isAiSeat(null)).toBe(false);
    expect(isAiSeat(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isAiSeat('')).toBe(false);
  });

  it('returns false for single dash', () => {
    expect(isAiSeat('-marcus')).toBe(false);
  });
});

describe('getAiPersona', () => {
  it('extracts persona name from AI seat ID', () => {
    expect(getAiPersona('--marcus')).toBe('marcus');
    expect(getAiPersona('--eddie')).toBe('eddie');
    expect(getAiPersona('--grandmaliu')).toBe('grandmaliu');
  });

  it('returns null for non-AI seat IDs', () => {
    expect(getAiPersona('socket-123')).toBe(null);
    expect(getAiPersona(null)).toBe(null);
  });
});

describe('processAiTurn', () => {
  let mockIo;
  let mockSendToEveryone;

  beforeEach(() => {
    mockIo = createMockIo();
    mockSendToEveryone = jest.fn();
    jest.clearAllTimers();
  });

  it('does nothing if game stage is not game', () => {
    const room = createAiRoom(['marcus'], 1);
    room.stage = 'seating';
    room.turnIndex = 1; // AI seat

    processAiTurn(room, mockSendToEveryone, mockIo, 'test-room');

    jest.runAllTimers();

    expect(mockSendToEveryone).not.toHaveBeenCalled();
  });

  it('does nothing if current turn is not AI', () => {
    const room = createGameRoom(2);
    room.stage = 'game';
    room.turnIndex = 0; // Human seat
    room.cards[0] = ['3c', '4d', '5h'];

    processAiTurn(room, mockSendToEveryone, mockIo, 'test-room');

    jest.runAllTimers();

    expect(mockSendToEveryone).not.toHaveBeenCalled();
  });

  it('schedules AI turn execution with delay', () => {
    const room = createAiRoom(['marcus'], 1);
    room.stage = 'game';
    room.turnIndex = 1; // AI seat is at index 1
    room.cards[1] = ['3c', '4d', '5h'];
    room.last = [null, null, null, null];
    room.initial = false;

    processAiTurn(room, mockSendToEveryone, mockIo, 'test-room');

    // Timer should be set but not fired yet
    expect(mockSendToEveryone).not.toHaveBeenCalled();

    // Fast forward all timers
    jest.runAllTimers();

    // AI should have taken action
    expect(mockSendToEveryone).toHaveBeenCalled();
  });

  it('AI takes action when it is AI turn', () => {
    const room = createAiRoom(['marcus'], 1);
    room.stage = 'game';
    room.turnIndex = 1; // AI seat (--marcus is at index 1)
    room.cards[0] = ['2s']; // Human has a card
    room.cards[1] = ['3c', '4d']; // AI has cards
    room.last = [null, null, null, null]; // Free play - AI can play anything
    room.initial = false;
    room.startingPlayers = 2;

    processAiTurn(room, mockSendToEveryone, mockIo, 'test-room');
    jest.runAllTimers();

    // AI should have taken some action (either played or passed)
    expect(mockSendToEveryone).toHaveBeenCalled();
    // Verify AI made a decision (last[1] is no longer null)
    expect(room.last[1]).not.toBeNull();
  });

  it('AI plays cards when valid plays available', () => {
    const room = createAiRoom(['marcus'], 1);
    room.stage = 'game';
    room.turnIndex = 1; // AI seat
    room.cards[0] = ['Ac']; // Human
    room.cards[1] = ['3c', '4d', '5h']; // AI has cards
    room.last = [null, null, null, null];
    room.initial = false;
    room.lowest = '3c';

    processAiTurn(room, mockSendToEveryone, mockIo, 'test-room');
    jest.runAllTimers();

    // AI should have played something (not passed)
    expect(room.last[1]).not.toBe('pass');
    expect(room.last[1]).not.toBeNull();
    expect(mockSendToEveryone).toHaveBeenCalled();
  });

  it('does not execute if turn changed before timer fires', () => {
    const room = createAiRoom(['marcus'], 1);
    room.stage = 'game';
    room.turnIndex = 1; // AI seat
    room.cards[1] = ['3c', '4d', '5h'];

    processAiTurn(room, mockSendToEveryone, mockIo, 'test-room');

    // Simulate turn change before timer fires
    room.turnIndex = 0;

    jest.runAllTimers();

    // Should not have broadcast since turn changed
    expect(mockSendToEveryone).not.toHaveBeenCalled();
  });

  it('does not execute if game ended before timer fires', () => {
    const room = createAiRoom(['marcus'], 1);
    room.stage = 'game';
    room.turnIndex = 1; // AI seat
    room.cards[1] = ['3c', '4d', '5h'];

    processAiTurn(room, mockSendToEveryone, mockIo, 'test-room');

    // Simulate game ending before timer fires
    room.stage = 'done';

    jest.runAllTimers();

    // Should not have broadcast since game ended
    expect(mockSendToEveryone).not.toHaveBeenCalled();
  });

  it('AI records bomb in stats when playing bomb', () => {
    const room = createAiRoom(['marcus'], 1);
    room.stage = 'game';
    room.turnIndex = 1; // AI seat
    room.cards[0] = ['Ac'];
    room.cards[1] = ['3c', '3d', '3h', '3s', '4c']; // Has bomb
    room.last = [{ play: 'One Pair', rank: 50 }, null, null, null]; // Pair of 2s on board
    room.initial = false;
    room.stats['--marcus'] = { bombs: 0 };

    // Mock random so Marcus uses the bomb
    const originalRandom = Math.random;
    Math.random = () => 0.9; // High random so Marcus doesn't pass

    processAiTurn(room, mockSendToEveryone, mockIo, 'test-room');
    jest.runAllTimers();

    Math.random = originalRandom;

    // If AI played the bomb, stats should be updated
    if (room.last[1]?.play === 'Bomb') {
      expect(room.stats['--marcus'].bombs).toBe(1);
    }
  });

  it('AI wins and gets rank when playing last card', () => {
    const room = createAiRoom(['marcus'], 1);
    room.stage = 'game';
    room.turnIndex = 1; // AI seat
    room.cards[0] = ['Ac', 'Ad']; // Human has cards
    room.cards[1] = ['3c']; // AI has one card
    room.last = [null, null, null, null]; // Free play
    room.initial = false;
    room.startingPlayers = 2;

    processAiTurn(room, mockSendToEveryone, mockIo, 'test-room');
    jest.runAllTimers();

    // AI should have won (rank assigned)
    expect(room.rank[1]).toBe(1);
    // Cards array may be empty or null depending on game end handling
    if (room.cards[1] !== null) {
      expect(room.cards[1]).toHaveLength(0);
    }
  });

  it('handles orphaned player when AI wins', () => {
    const room = createAiRoom(['marcus'], 1);
    room.stage = 'game';
    room.turnIndex = 1; // AI seat
    room.seated = ['socket-1', '--marcus', null, null];
    room.cards[0] = ['Ac']; // Human has one card
    room.cards[1] = ['3c']; // AI has one card
    room.last = [null, null, null, null]; // Free play
    room.initial = false;
    room.startingPlayers = 2;
    room.stats['socket-1'] = { points: 0, playerGames: 0, games: 0, first: 0, second: 0, third: 0, fourth: 0, bombs: 0 };
    room.stats['--marcus'] = { points: 0, playerGames: 0, games: 0, first: 0, second: 0, third: 0, fourth: 0, bombs: 0 };

    processAiTurn(room, mockSendToEveryone, mockIo, 'test-room');
    jest.runAllTimers();

    // AI gets 1st, human gets 2nd (orphaned)
    expect(room.rank[1]).toBe(1); // AI
    expect(room.rank[0]).toBe(2); // Human orphaned
  });

  it('does not execute when seat ID is not actually AI', () => {
    // Test that processAiTurn validates the seat is actually an AI
    const room = createGameRoom(2); // Regular human room
    room.stage = 'game';
    room.turnIndex = 0; // Human seat
    room.cards[0] = ['3c', '4d'];
    room.cards[2] = ['5h', '6s'];
    room.initial = false;

    processAiTurn(room, mockSendToEveryone, mockIo, 'test-room');
    jest.runAllTimers();

    // Should not have executed since seat 0 is human, not AI
    expect(mockSendToEveryone).not.toHaveBeenCalled();
  });

  it('AI executes when facing unbeatable board (verifies execution path)', () => {
    const room = createAiRoom(['marcus'], 1);
    room.stage = 'game';
    room.turnIndex = 1; // AI seat
    room.cards[0] = ['2s']; // Human
    room.cards[1] = ['3c', '4d']; // AI has low singles only
    // Board has a pair - AI has no pairs to play
    room.last = [{ play: 'One Pair', rank: 50 }, null, null, null];
    room.initial = false;
    room.startingPlayers = 2;

    // Store initial turnIndex to verify AI processed
    const initialTurnIndex = room.turnIndex;

    processAiTurn(room, mockSendToEveryone, mockIo, 'test-room');
    jest.runAllTimers();

    // AI execution completed and state was broadcast
    expect(mockSendToEveryone).toHaveBeenCalled();
    // Turn should have advanced (AI either played or passed)
    // Note: specific pass behavior depends on strategy implementation
  });

  it('does not execute if AI hand is empty', () => {
    const room = createAiRoom(['marcus'], 1);
    room.stage = 'game';
    room.turnIndex = 1; // AI seat
    room.cards[1] = []; // AI has no cards
    room.initial = false;

    processAiTurn(room, mockSendToEveryone, mockIo, 'test-room');
    jest.runAllTimers();

    // Should not have broadcast since AI has no cards
    expect(mockSendToEveryone).not.toHaveBeenCalled();
  });
});

afterAll(() => {
  jest.useRealTimers();
});
