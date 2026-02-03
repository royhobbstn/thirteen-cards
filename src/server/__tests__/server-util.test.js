import {
  isAiSeat,
  getAiPersona,
  findLowestAvailableRank,
  findHighestAvailableRank,
  countRemainingPlayers,
  findOrphanedSeat,
  findSeatIndex,
  assignGamePoints,
  assignRankToPlayer,
  validateTurn,
  validateOwnsCards,
  validateInitialPlay,
  validatePlayBeatsBoard,
  getLastPlay,
  shouldClearBoard,
  clearBoardForFreePlay,
  replaceSocketId,
  findNextPlayersTurn,
} from '../server-util.js';
import { createMockRoom, createGameRoom, DETECTIONS } from '../../testFixtures/rooms.js';

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

describe('findLowestAvailableRank', () => {
  it('returns 1 when no ranks assigned', () => {
    const room = createGameRoom(2);
    expect(findLowestAvailableRank(room)).toBe(1);
  });

  it('returns 2 when 1st place is taken', () => {
    const room = createGameRoom(2, { rank: [1, null, null, null] });
    expect(findLowestAvailableRank(room)).toBe(2);
  });

  it('returns 3 when 1st and 2nd are taken', () => {
    const room = createGameRoom(4, { rank: [1, 2, null, null] });
    expect(findLowestAvailableRank(room)).toBe(3);
  });

  it('returns 0 when all ranks assigned', () => {
    const room = createGameRoom(4, { rank: [1, 2, 3, 4] });
    expect(findLowestAvailableRank(room)).toBe(0);
  });
});

describe('findHighestAvailableRank', () => {
  it('returns startingPlayers when no ranks assigned', () => {
    const room = createGameRoom(4);
    expect(findHighestAvailableRank(room)).toBe(4);
  });

  it('returns 2nd highest when last place is taken', () => {
    const room = createGameRoom(4, { rank: [null, null, null, 4] });
    expect(findHighestAvailableRank(room)).toBe(3);
  });

  it('returns 2 for 2-player game', () => {
    const room = createGameRoom(2);
    expect(findHighestAvailableRank(room)).toBe(2);
  });
});

describe('countRemainingPlayers', () => {
  it('returns correct count with no finishers', () => {
    const room = createGameRoom(4);
    expect(countRemainingPlayers(room)).toBe(4);
  });

  it('returns correct count with some finishers', () => {
    const room = createGameRoom(4, { rank: [1, null, 2, null] });
    expect(countRemainingPlayers(room)).toBe(2);
  });

  it('returns 0 when all have ranks', () => {
    const room = createGameRoom(4, { rank: [1, 2, 3, 4] });
    expect(countRemainingPlayers(room)).toBe(0);
  });
});

describe('findOrphanedSeat', () => {
  it('returns [count, index] for single remaining player', () => {
    const room = createGameRoom(2, { rank: [1, null, null, null] });
    const [count, index] = findOrphanedSeat(room);
    expect(count).toBe(1);
    expect(index).toBe(2); // seat 2 has player 2 in 2-player game
  });

  it('returns count > 1 when multiple players remain', () => {
    const room = createGameRoom(4);
    const [count] = findOrphanedSeat(room);
    expect(count).toBe(4);
  });
});

describe('findSeatIndex', () => {
  it('returns seat index for seated player', () => {
    const room = createGameRoom(2);
    expect(findSeatIndex(room, 'socket-1')).toBe(0);
    expect(findSeatIndex(room, 'socket-2')).toBe(2);
  });

  it('returns null for unseated player', () => {
    const room = createGameRoom(2);
    expect(findSeatIndex(room, 'unknown-socket')).toBe(null);
  });
});

describe('assignGamePoints', () => {
  it('calculates points correctly for 4-player game', () => {
    const room = createGameRoom(4);
    expect(assignGamePoints(room, 1)).toBe(4); // 4 - 1 + 1 = 4
    expect(assignGamePoints(room, 2)).toBe(3);
    expect(assignGamePoints(room, 3)).toBe(2);
    expect(assignGamePoints(room, 4)).toBe(1);
  });

  it('calculates points correctly for 2-player game', () => {
    const room = createGameRoom(2);
    expect(assignGamePoints(room, 1)).toBe(2); // 2 - 1 + 1 = 2
    expect(assignGamePoints(room, 2)).toBe(1);
  });
});

describe('assignRankToPlayer', () => {
  it('assigns rank to player', () => {
    const room = createGameRoom(2);
    assignRankToPlayer(room, 0, 1);
    expect(room.rank[0]).toBe(1);
  });

  it('updates player stats', () => {
    const room = createGameRoom(2);
    assignRankToPlayer(room, 0, 1);
    expect(room.stats['socket-1'].games).toBe(1);
    expect(room.stats['socket-1'].first).toBe(1);
    expect(room.stats['socket-1'].points).toBe(2); // 2-player: 2 - 1 + 1 = 2
  });

  it('tracks correct placement', () => {
    const room = createGameRoom(4);
    assignRankToPlayer(room, 0, 2);
    expect(room.stats['socket-1'].second).toBe(1);
    expect(room.stats['socket-1'].first).toBe(0);
  });
});

describe('validateTurn', () => {
  it('returns true when it is the players turn', () => {
    const room = createGameRoom(2, { turnIndex: 0 });
    expect(validateTurn(room, 'socket-1')).toBe(true);
  });

  it('returns false when it is not the players turn', () => {
    const room = createGameRoom(2, { turnIndex: 2 });
    expect(validateTurn(room, 'socket-1')).toBe(false);
  });
});

describe('validateOwnsCards', () => {
  it('returns true when player owns all cards', () => {
    const room = createGameRoom(2);
    room.cards[0] = ['3c', '4d', '5h'];
    expect(validateOwnsCards(room, 'socket-1', ['3c', '4d'])).toBe(true);
  });

  it('returns false when player does not own a card', () => {
    const room = createGameRoom(2);
    room.cards[0] = ['3c', '4d', '5h'];
    expect(validateOwnsCards(room, 'socket-1', ['3c', '6s'])).toBe(false);
  });

  it('returns false for non-seated player', () => {
    const room = createGameRoom(2);
    expect(validateOwnsCards(room, 'unknown', ['3c'])).toBe(false);
  });
});

describe('validateInitialPlay', () => {
  it('returns true when not initial play', () => {
    const room = createGameRoom(2, { initial: false, lowest: '3c' });
    expect(validateInitialPlay(room, ['4d', '5h'])).toBe(true);
  });

  it('returns true when initial play includes lowest card', () => {
    const room = createGameRoom(2, { initial: true, lowest: '3c' });
    expect(validateInitialPlay(room, ['3c', '4d'])).toBe(true);
  });

  it('returns false when initial play missing lowest card', () => {
    const room = createGameRoom(2, { initial: true, lowest: '3c' });
    expect(validateInitialPlay(room, ['4d', '5h'])).toBe(false);
  });
});

describe('getLastPlay', () => {
  it('returns Free Play when no previous plays', () => {
    const room = createGameRoom(2, { last: [null, null, null, null] });
    const lastPlay = getLastPlay(room, 0);
    expect(lastPlay.play).toBe('Free Play');
  });

  it('finds last non-pass play', () => {
    const room = createGameRoom(4, {
      last: [null, DETECTIONS.pairThrees, 'pass', null],
    });
    const lastPlay = getLastPlay(room, 0); // seat 0 looking back
    expect(lastPlay).toEqual(DETECTIONS.pairThrees);
  });

  it('skips passes to find actual play', () => {
    const room = createGameRoom(4, {
      last: [DETECTIONS.single3c, 'pass', 'pass', null],
    });
    const lastPlay = getLastPlay(room, 3);
    expect(lastPlay).toEqual(DETECTIONS.single3c);
  });

  it('wraps around the table', () => {
    const room = createGameRoom(4, {
      last: [DETECTIONS.tripleAces, null, null, null],
    });
    room.turnIndex = 1;
    const lastPlay = getLastPlay(room, 1);
    expect(lastPlay).toEqual(DETECTIONS.tripleAces);
  });
});

describe('validatePlayBeatsBoard', () => {
  it('returns true for Free Play', () => {
    const room = createGameRoom(2, { last: [null, null, null, null] });
    expect(validatePlayBeatsBoard(room, 0, DETECTIONS.single3c)).toBe(true);
  });

  it('returns true for higher single', () => {
    const room = createGameRoom(2, { last: [DETECTIONS.single3c, null, null, null] });
    room.turnIndex = 2;
    expect(validatePlayBeatsBoard(room, 2, DETECTIONS.single2s)).toBe(true);
  });

  it('returns false for lower single', () => {
    const room = createGameRoom(2, { last: [DETECTIONS.single2s, null, null, null] });
    room.turnIndex = 2;
    expect(validatePlayBeatsBoard(room, 2, DETECTIONS.single3c)).toBe(false);
  });

  it('returns true for bomb on any play', () => {
    const room = createGameRoom(2, { last: [DETECTIONS.pairTwos, null, null, null] });
    room.turnIndex = 2;
    expect(validatePlayBeatsBoard(room, 2, DETECTIONS.bomb)).toBe(true);
  });

  it('returns false for mismatched play type', () => {
    const room = createGameRoom(2, { last: [DETECTIONS.pairThrees, null, null, null] });
    room.turnIndex = 2;
    expect(validatePlayBeatsBoard(room, 2, DETECTIONS.single2s)).toBe(false);
  });

  it('returns true for straight flush on straight', () => {
    const room = createGameRoom(2, {
      last: [DETECTIONS.fiveCardStraight, null, null, null],
    });
    room.turnIndex = 2;
    const highStraightFlush = { ...DETECTIONS.straightFlush, rank: 150 };
    expect(validatePlayBeatsBoard(room, 2, highStraightFlush)).toBe(true);
  });

  it('returns true for straight flush on flush', () => {
    const room = createGameRoom(2, {
      last: [DETECTIONS.flush, null, null, null],
    });
    room.turnIndex = 2;
    // Straight flush must have higher rank than the flush
    const highStraightFlush = { play: 'Straight Flush', rank: 150 };
    expect(validatePlayBeatsBoard(room, 2, highStraightFlush)).toBe(true);
  });

  it('returns false for lower straight flush on flush', () => {
    const room = createGameRoom(2, {
      last: [{ play: 'Flush', rank: 200 }, null, null, null],
    });
    room.turnIndex = 2;
    // Straight flush with lower rank should fail
    const lowStraightFlush = { play: 'Straight Flush', rank: 50 };
    expect(validatePlayBeatsBoard(room, 2, lowStraightFlush)).toBe(false);
  });
});

describe('shouldClearBoard', () => {
  it('returns false when not all have passed', () => {
    const room = createGameRoom(4, {
      last: [DETECTIONS.single3c, 'pass', null, null],
    });
    expect(shouldClearBoard(room)).toBe(false);
  });

  it('returns true when all but one have passed', () => {
    const room = createGameRoom(4, {
      last: [DETECTIONS.single3c, 'pass', 'pass', 'pass'],
    });
    expect(shouldClearBoard(room)).toBe(true);
  });

  it('returns true when last player finished and all remaining passed', () => {
    const room = createGameRoom(4, {
      last: [DETECTIONS.single3c, 'pass', 'pass', 'pass'],
      rank: [1, null, null, null], // player 0 finished
    });
    expect(shouldClearBoard(room)).toBe(true);
  });
});

describe('clearBoardForFreePlay', () => {
  it('clears board and last plays', () => {
    const room = createGameRoom(2, {
      board: ['3c', '4d'],
      last: [DETECTIONS.pairThrees, 'pass', null, null],
    });
    clearBoardForFreePlay(room);
    expect(room.board).toEqual([]);
    expect(room.last).toEqual([null, null, null, null]);
  });
});

describe('replaceSocketId', () => {
  it('replaces socket ID in seated array', () => {
    const room = createGameRoom(2);
    replaceSocketId(room, 'socket-1', 'new-socket');
    expect(room.seated[0]).toBe('new-socket');
  });

  it('replaces socket ID in players array', () => {
    const room = createGameRoom(2);
    replaceSocketId(room, 'socket-1', 'new-socket');
    expect(room.players).toContain('new-socket');
    expect(room.players).not.toContain('socket-1');
  });

  it('moves aliases to new socket ID', () => {
    const room = createGameRoom(2);
    replaceSocketId(room, 'socket-1', 'new-socket');
    expect(room.aliases['new-socket']).toBe('Player 1');
    expect(room.aliases['socket-1']).toBeUndefined();
  });

  it('moves stats to new socket ID', () => {
    const room = createGameRoom(2);
    room.stats['socket-1'].points = 10;
    replaceSocketId(room, 'socket-1', 'new-socket');
    expect(room.stats['new-socket'].points).toBe(10);
    expect(room.stats['socket-1']).toBeUndefined();
  });

  it('moves colors to new socket ID', () => {
    const room = createGameRoom(2);
    room.colors['socket-1'] = '#00ff00';
    replaceSocketId(room, 'socket-1', 'new-socket');
    expect(room.colors['new-socket']).toBe('#00ff00');
    expect(room.colors['socket-1']).toBeUndefined();
  });
});

describe('findNextPlayersTurn', () => {
  it('finds next seated player', () => {
    const room = createGameRoom(4, { turnIndex: 0 });
    expect(findNextPlayersTurn(room)).toBe(1);
  });

  it('skips empty seats', () => {
    const room = createGameRoom(2, { turnIndex: 0 }); // players at 0 and 2
    expect(findNextPlayersTurn(room)).toBe(2);
  });

  it('skips finished players', () => {
    const room = createGameRoom(4, { turnIndex: 0, rank: [null, 1, null, null] });
    expect(findNextPlayersTurn(room)).toBe(2);
  });

  it('wraps around to beginning', () => {
    const room = createGameRoom(4, { turnIndex: 3 });
    expect(findNextPlayersTurn(room)).toBe(0);
  });

  it('throws error when no valid next player', () => {
    const room = createGameRoom(4, {
      turnIndex: 0,
      rank: [null, 1, 2, 3],
      seated: [null, 'socket-2', 'socket-3', 'socket-4'],
    });
    expect(() => findNextPlayersTurn(room)).toThrow();
  });

  it('treats disconnected as a seated player (truthy check)', () => {
    // Note: findNextPlayersTurn only checks if seat is truthy and not finished
    // 'disconnected' is truthy, so it won't be skipped (unlike shouldClearBoard which explicitly skips it)
    const room = createGameRoom(4, { turnIndex: 0 });
    room.seated[1] = 'disconnected';
    // Disconnected is truthy and has no rank, so it's considered next player
    expect(findNextPlayersTurn(room)).toBe(1);
  });
});
