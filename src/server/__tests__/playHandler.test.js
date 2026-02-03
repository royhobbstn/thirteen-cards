import {
  processCardPlay,
  checkWinCondition,
  handleWin,
  handleOrphanedPlayer,
  isGameOver,
  recordBombIfApplicable,
} from '../playHandler.js';
import { createGameRoom } from '../../testFixtures/rooms.js';

describe('processCardPlay', () => {
  it('updates board with played cards', () => {
    const room = createGameRoom(2);
    room.cards[0] = ['3c', '4d', '5h'];
    room.initial = true;

    const detection = { play: 'Singles', rank: 1 };
    const newRoom = processCardPlay(room, 0, ['3c'], detection);

    expect(newRoom.board).toEqual(['3c']);
    expect(newRoom.initial).toBe(false);
  });

  it('sorts board cards by rank', () => {
    const room = createGameRoom(2);
    room.cards[0] = ['3c', '4d', '5h', '6s', '7c'];

    const detection = { play: '3 Card Straight', rank: 5 };
    const newRoom = processCardPlay(room, 0, ['3c', '5h', '4d'], detection);

    // Cards should be sorted high to low
    expect(newRoom.board[0]).toBe('5h');
    expect(newRoom.board[2]).toBe('3c');
  });

  it('records last play for seat', () => {
    const room = createGameRoom(2);
    room.cards[0] = ['3c', '4d'];
    room.last = [{ play: 'Old', rank: 1 }, null, { play: 'Old', rank: 2 }, null];

    const detection = { play: 'Singles', rank: 1 };
    const newRoom = processCardPlay(room, 0, ['3c'], detection);

    expect(newRoom.last[0]).toEqual(detection);
    expect(newRoom.last[2]).toBeNull(); // Others reset
  });

  it('removes played cards from hand', () => {
    const room = createGameRoom(2);
    room.cards[0] = ['3c', '4d', '5h'];

    const detection = { play: 'Singles', rank: 1 };
    const newRoom = processCardPlay(room, 0, ['3c'], detection);

    expect(newRoom.cards[0]).toEqual(['4d', '5h']);
  });

  it('clears lastPassSeat', () => {
    const room = createGameRoom(2);
    room.cards[0] = ['3c', '4d'];
    room.lastPassSeat = 2;

    const detection = { play: 'Singles', rank: 1 };
    const newRoom = processCardPlay(room, 0, ['3c'], detection);

    expect(newRoom.lastPassSeat).toBeNull();
  });
});

describe('checkWinCondition', () => {
  it('returns true when player has no cards', () => {
    const room = createGameRoom(2);
    room.cards[0] = [];

    expect(checkWinCondition(room, 0)).toBe(true);
  });

  it('returns false when player has cards', () => {
    const room = createGameRoom(2);
    room.cards[0] = ['3c'];

    expect(checkWinCondition(room, 0)).toBe(false);
  });

  it('returns falsy when cards is null', () => {
    const room = createGameRoom(2);
    room.cards[0] = null;

    expect(checkWinCondition(room, 0)).toBeFalsy();
  });
});

describe('handleWin', () => {
  it('assigns rank to winner', () => {
    const room = createGameRoom(2);
    room.startingPlayers = 2;
    room.cards[0] = [];

    const rank = handleWin(room, 0);

    expect(rank).toBe(1);
    expect(room.rank[0]).toBe(1);
  });

  it('assigns next available rank', () => {
    const room = createGameRoom(4);
    room.startingPlayers = 4;
    room.rank = [1, null, null, null]; // 1st place taken

    const rank = handleWin(room, 1);

    expect(rank).toBe(2);
    expect(room.rank[1]).toBe(2);
  });

  it('updates player stats', () => {
    const room = createGameRoom(2);
    room.startingPlayers = 2;
    room.cards[0] = [];

    handleWin(room, 0);

    expect(room.stats['socket-1'].first).toBe(1);
    expect(room.stats['socket-1'].games).toBe(1);
  });
});

describe('handleOrphanedPlayer', () => {
  it('assigns final rank to last remaining player', () => {
    const room = createGameRoom(2);
    room.startingPlayers = 2;
    room.rank = [1, null, null, null]; // Player 0 finished

    const result = handleOrphanedPlayer(room);

    expect(result).not.toBeNull();
    expect(result.seatIndex).toBe(2);
    expect(result.rank).toBe(2);
    expect(room.rank[2]).toBe(2);
  });

  it('returns null when multiple players remain', () => {
    const room = createGameRoom(4);
    room.startingPlayers = 4;
    room.rank = [1, null, null, null]; // Only 1 finished

    const result = handleOrphanedPlayer(room);

    expect(result).toBeNull();
  });

  it('handles 4-player game orphan', () => {
    const room = createGameRoom(4);
    room.startingPlayers = 4;
    room.rank = [1, 2, 3, null]; // Only seat 3 remaining

    const result = handleOrphanedPlayer(room);

    expect(result).not.toBeNull();
    expect(result.seatIndex).toBe(3);
    expect(result.rank).toBe(4);
  });
});

describe('isGameOver', () => {
  it('returns true when all players have ranks', () => {
    const room = createGameRoom(2);
    room.rank = [1, null, 2, null];

    expect(isGameOver(room)).toBe(true);
  });

  it('returns false when players remain', () => {
    const room = createGameRoom(2);
    room.rank = [1, null, null, null];

    expect(isGameOver(room)).toBe(false);
  });

  it('returns false when no ranks assigned', () => {
    const room = createGameRoom(4);

    expect(isGameOver(room)).toBe(false);
  });
});

describe('recordBombIfApplicable', () => {
  it('increments bomb count for bomb play', () => {
    const room = createGameRoom(2);
    room.stats['socket-1'].bombs = 0;

    const detection = { play: 'Bomb', rank: 100 };
    recordBombIfApplicable(room, 'socket-1', detection);

    expect(room.stats['socket-1'].bombs).toBe(1);
  });

  it('does not increment for non-bomb play', () => {
    const room = createGameRoom(2);
    room.stats['socket-1'].bombs = 0;

    const detection = { play: 'Singles', rank: 1 };
    recordBombIfApplicable(room, 'socket-1', detection);

    expect(room.stats['socket-1'].bombs).toBe(0);
  });

  it('handles missing stats gracefully', () => {
    const room = createGameRoom(2);

    const detection = { play: 'Bomb', rank: 100 };

    // Should not throw
    expect(() => {
      recordBombIfApplicable(room, 'unknown-socket', detection);
    }).not.toThrow();
  });
});
