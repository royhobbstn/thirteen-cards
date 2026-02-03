/**
 * Integration tests for game flow
 * Tests complete game scenarios including turn transitions, board clearing, and win conditions
 */

import {
  findNextPlayersTurn,
  assignRankToPlayer,
  shouldClearBoard,
  clearBoardForFreePlay,
  countRemainingPlayers,
  findOrphanedSeat,
  validateTurn,
  validateOwnsCards,
  validateInitialPlay,
  validatePlayBeatsBoard,
  getLastPlay,
} from '../server/server-util.js';
import { createGameRoom, createAiRoom, DETECTIONS } from '../testFixtures/rooms.js';

describe('Game Flow Integration', () => {
  describe('Two-player game flow', () => {
    it('completes a full 2-player game with turn alternation', () => {
      const room = createGameRoom(2);
      room.stage = 'game';
      room.cards[0] = ['3c', '4d', '5h'];
      room.cards[2] = ['6c', '7d', '8h'];
      room.turnIndex = 0;
      room.initial = false;
      room.startingPlayers = 2;

      // Player 0 plays
      expect(validateTurn(room, 'socket-1')).toBe(true);
      expect(validateTurn(room, 'socket-2')).toBe(false);

      // Simulate play and turn advancement
      room.last[0] = { play: 'Singles', rank: 1 };
      room.turnIndex = findNextPlayersTurn(room);
      expect(room.turnIndex).toBe(2);

      // Player 2 plays
      expect(validateTurn(room, 'socket-2')).toBe(true);
      room.last[2] = { play: 'Singles', rank: 21 };
      room.turnIndex = findNextPlayersTurn(room);
      expect(room.turnIndex).toBe(0);
    });

    it('handles player winning and orphaned player assignment', () => {
      const room = createGameRoom(2);
      room.stage = 'game';
      room.cards[0] = ['3c'];
      room.cards[2] = ['6c', '7d'];
      room.turnIndex = 0;
      room.startingPlayers = 2;

      // Player 0 plays last card and wins
      room.cards[0] = [];
      assignRankToPlayer(room, 0, 1);

      expect(room.rank[0]).toBe(1);
      expect(room.stats['socket-1'].first).toBe(1);
      expect(room.stats['socket-1'].points).toBe(2); // 2 - 1 + 1 = 2

      // Check orphaned player
      const [count, index] = findOrphanedSeat(room);
      expect(count).toBe(1);
      expect(index).toBe(2);

      // Assign last place to orphaned player
      assignRankToPlayer(room, 2, 2);
      expect(room.rank[2]).toBe(2);
      expect(room.stats['socket-2'].second).toBe(1);
    });

    it('correctly counts remaining players', () => {
      const room = createGameRoom(2);
      room.startingPlayers = 2;

      expect(countRemainingPlayers(room)).toBe(2);

      assignRankToPlayer(room, 0, 1);
      expect(countRemainingPlayers(room)).toBe(1);

      assignRankToPlayer(room, 2, 2);
      expect(countRemainingPlayers(room)).toBe(0);
    });
  });

  describe('Three-player game flow', () => {
    it('rotates through 3 players correctly', () => {
      const room = createGameRoom(3);
      room.stage = 'game';
      room.cards[0] = ['3c'];
      room.cards[1] = ['4d'];
      room.cards[2] = ['5h'];
      room.turnIndex = 0;

      // Full rotation: 0 -> 1 -> 2 -> 0
      const turns = [0];
      for (let i = 0; i < 3; i++) {
        room.turnIndex = findNextPlayersTurn(room);
        turns.push(room.turnIndex);
      }

      expect(turns).toEqual([0, 1, 2, 0]);
    });

    it('handles 3-player orphan scenario correctly', () => {
      const room = createGameRoom(3);
      room.stage = 'game';
      room.startingPlayers = 3;

      // Players 0 and 1 finish, player 2 is orphaned
      assignRankToPlayer(room, 0, 1);
      assignRankToPlayer(room, 1, 2);

      const [count, index] = findOrphanedSeat(room);
      expect(count).toBe(1);
      expect(index).toBe(2);

      assignRankToPlayer(room, 2, 3);
      expect(room.rank[2]).toBe(3);
      expect(room.stats['socket-3'].third).toBe(1);
    });

    it('calculates points correctly for 3-player game', () => {
      const room = createGameRoom(3);
      room.startingPlayers = 3;

      assignRankToPlayer(room, 0, 1); // 3 - 1 + 1 = 3 points
      assignRankToPlayer(room, 1, 2); // 3 - 2 + 1 = 2 points
      assignRankToPlayer(room, 2, 3); // 3 - 3 + 1 = 1 point

      expect(room.stats['socket-1'].points).toBe(3);
      expect(room.stats['socket-2'].points).toBe(2);
      expect(room.stats['socket-3'].points).toBe(1);
    });
  });

  describe('Four-player game with turn rotation', () => {
    it('rotates through all 4 players correctly', () => {
      const room = createGameRoom(4);
      room.stage = 'game';
      room.cards = [['3c'], ['4d'], ['5h'], ['6s']];
      room.turnIndex = 0;

      // Full rotation
      const turns = [0];
      for (let i = 0; i < 4; i++) {
        room.turnIndex = findNextPlayersTurn(room);
        turns.push(room.turnIndex);
      }

      // Should cycle: 0 -> 1 -> 2 -> 3 -> 0
      expect(turns).toEqual([0, 1, 2, 3, 0]);
    });

    it('skips finished players in rotation', () => {
      const room = createGameRoom(4);
      room.stage = 'game';
      room.cards = [['3c'], null, ['5h'], ['6s']];
      room.rank = [null, 1, null, null]; // Player 1 finished
      room.turnIndex = 0;

      // Should skip seat 1
      room.turnIndex = findNextPlayersTurn(room);
      expect(room.turnIndex).toBe(2);
    });

    it('skips empty seats in rotation', () => {
      const room = createGameRoom(2); // Only seats 0 and 2 occupied
      room.stage = 'game';
      room.cards[0] = ['3c'];
      room.cards[2] = ['5h'];
      room.turnIndex = 0;

      // Should skip seats 1 and 3
      room.turnIndex = findNextPlayersTurn(room);
      expect(room.turnIndex).toBe(2);
    });

    it('tracks rankings correctly for 4 players', () => {
      const room = createGameRoom(4);
      room.startingPlayers = 4;

      // Players finish in order: 2, 0, 3, 1
      assignRankToPlayer(room, 2, 1);
      assignRankToPlayer(room, 0, 2);
      assignRankToPlayer(room, 3, 3);
      assignRankToPlayer(room, 1, 4);

      expect(room.rank).toEqual([2, 4, 1, 3]);
      expect(room.stats['socket-3'].first).toBe(1);
      expect(room.stats['socket-1'].second).toBe(1);
      expect(room.stats['socket-4'].third).toBe(1);
      expect(room.stats['socket-2'].fourth).toBe(1);
    });
  });

  describe('Board clearing mechanics', () => {
    it('clears board when all but one player passes', () => {
      const room = createGameRoom(4);
      room.stage = 'game';
      room.cards = [['3c'], ['4d'], ['5h'], ['6s']];

      // Player 0 plays, others pass
      room.last = [{ play: 'Singles', rank: 1 }, 'pass', 'pass', 'pass'];

      expect(shouldClearBoard(room)).toBe(true);

      clearBoardForFreePlay(room);
      expect(room.board).toEqual([]);
      expect(room.last).toEqual([null, null, null, null]);
    });

    it('does not clear board if not all passed', () => {
      const room = createGameRoom(4);
      room.stage = 'game';
      room.cards = [['3c'], ['4d'], ['5h'], ['6s']];

      // Only one player passed
      room.last = [{ play: 'Singles', rank: 1 }, 'pass', null, null];

      expect(shouldClearBoard(room)).toBe(false);
    });

    it('clears board when last player finished and others passed', () => {
      const room = createGameRoom(4);
      room.stage = 'game';
      room.cards = [null, ['4d'], ['5h'], ['6s']];
      room.rank = [1, null, null, null]; // Player 0 finished

      // Player 0 played (but finished), others passed
      room.last = [{ play: 'Singles', rank: 52 }, 'pass', 'pass', 'pass'];

      expect(shouldClearBoard(room)).toBe(true);
    });

    it('handles disconnected players in board clearing', () => {
      const room = createGameRoom(4);
      room.stage = 'game';
      room.seated[1] = 'disconnected';
      room.cards = [['3c'], null, ['5h'], ['6s']];

      // Player 0 plays, remaining active players pass
      room.last = [{ play: 'Singles', rank: 1 }, null, 'pass', 'pass'];

      expect(shouldClearBoard(room)).toBe(true);
    });
  });

  describe('Orphaned player handling', () => {
    it('identifies orphaned player correctly', () => {
      const room = createGameRoom(4);
      room.rank = [1, 2, 3, null]; // Only seat 3 remaining

      const [count, index] = findOrphanedSeat(room);
      expect(count).toBe(1);
      expect(index).toBe(3);
    });

    it('returns count > 1 when multiple players remain', () => {
      const room = createGameRoom(4);
      room.rank = [1, null, 2, null]; // Seats 1 and 3 remaining

      const [count] = findOrphanedSeat(room);
      expect(count).toBe(2);
    });

    it('handles empty seats in orphan detection', () => {
      const room = createGameRoom(2); // Only seats 0 and 2 occupied
      room.rank = [1, null, null, null]; // Seat 0 finished

      const [count, index] = findOrphanedSeat(room);
      expect(count).toBe(1);
      expect(index).toBe(2);
    });
  });

  describe('Play validation integration', () => {
    it('validates complete play sequence', () => {
      const room = createGameRoom(2);
      room.stage = 'game';
      room.cards[0] = ['3c', '4d', '5h'];
      room.cards[2] = ['6c', '7d', '8h'];
      room.turnIndex = 0;
      room.lowest = '3c';
      room.initial = true;

      // Validate it's player's turn
      expect(validateTurn(room, 'socket-1')).toBe(true);

      // Validate player owns cards
      expect(validateOwnsCards(room, 'socket-1', ['3c'])).toBe(true);
      expect(validateOwnsCards(room, 'socket-1', ['6c'])).toBe(false);

      // Validate initial play contains lowest
      expect(validateInitialPlay(room, ['3c'])).toBe(true);
      expect(validateInitialPlay(room, ['4d'])).toBe(false);
    });

    it('validates play beats board', () => {
      const room = createGameRoom(2);
      room.last = [DETECTIONS.single3c, null, null, null];
      room.turnIndex = 2;

      // Higher single beats lower single
      expect(validatePlayBeatsBoard(room, 2, DETECTIONS.single2s)).toBe(true);

      // Lower single doesn't beat higher single
      room.last = [DETECTIONS.single2s, null, null, null];
      expect(validatePlayBeatsBoard(room, 2, DETECTIONS.single3c)).toBe(false);

      // Bomb beats anything
      expect(validatePlayBeatsBoard(room, 2, DETECTIONS.bomb)).toBe(true);
    });

    it('validates free play scenario', () => {
      const room = createGameRoom(2);
      room.last = [null, null, null, null];
      room.turnIndex = 0;

      const lastPlay = getLastPlay(room, 0);
      expect(lastPlay.play).toBe('Free Play');

      // Any valid play should be allowed on free play
      expect(validatePlayBeatsBoard(room, 0, DETECTIONS.single3c)).toBe(true);
      expect(validatePlayBeatsBoard(room, 0, DETECTIONS.pairThrees)).toBe(true);
    });
  });

  describe('AI player integration', () => {
    it('finds next turn correctly with AI players', () => {
      const room = createAiRoom(['marcus', 'eddie'], 1);
      room.stage = 'game';
      room.cards[0] = ['3c'];
      room.cards[1] = ['4d'];
      room.cards[2] = ['5h'];
      room.turnIndex = 0;

      // Human at 0, AI at 1 and 2
      room.turnIndex = findNextPlayersTurn(room);
      expect(room.turnIndex).toBe(1); // Marcus

      room.turnIndex = findNextPlayersTurn(room);
      expect(room.turnIndex).toBe(2); // Eddie

      room.turnIndex = findNextPlayersTurn(room);
      expect(room.turnIndex).toBe(0); // Back to human
    });

    it('handles AI player finishing', () => {
      const room = createAiRoom(['marcus'], 1);
      room.stage = 'game';
      room.startingPlayers = 2;

      assignRankToPlayer(room, 1, 1); // AI wins

      expect(room.rank[1]).toBe(1);
      expect(room.stats['--marcus'].first).toBe(1);

      // Human is orphaned
      const [count, index] = findOrphanedSeat(room);
      expect(count).toBe(1);
      expect(index).toBe(0);
    });
  });

  describe('Points and statistics', () => {
    it('calculates points correctly for 4-player game', () => {
      const room = createGameRoom(4);
      room.startingPlayers = 4;

      assignRankToPlayer(room, 0, 1); // 1st: 4 - 1 + 1 = 4 points
      assignRankToPlayer(room, 1, 2); // 2nd: 4 - 2 + 1 = 3 points
      assignRankToPlayer(room, 2, 3); // 3rd: 4 - 3 + 1 = 2 points
      assignRankToPlayer(room, 3, 4); // 4th: 4 - 4 + 1 = 1 point

      expect(room.stats['socket-1'].points).toBe(4);
      expect(room.stats['socket-2'].points).toBe(3);
      expect(room.stats['socket-3'].points).toBe(2);
      expect(room.stats['socket-4'].points).toBe(1);
    });

    it('accumulates stats across multiple games', () => {
      const room = createGameRoom(2);
      room.startingPlayers = 2;

      // Game 1: socket-1 wins
      assignRankToPlayer(room, 0, 1);
      assignRankToPlayer(room, 2, 2);

      expect(room.stats['socket-1'].games).toBe(1);
      expect(room.stats['socket-1'].first).toBe(1);
      expect(room.stats['socket-1'].points).toBe(2);
      expect(room.stats['socket-1'].playerGames).toBe(2);

      // Game 2: socket-2 wins (reset ranks first)
      room.rank = [null, null, null, null];
      assignRankToPlayer(room, 2, 1);
      assignRankToPlayer(room, 0, 2);

      expect(room.stats['socket-1'].games).toBe(2);
      expect(room.stats['socket-1'].first).toBe(1);
      expect(room.stats['socket-1'].second).toBe(1);
      expect(room.stats['socket-1'].points).toBe(3); // 2 + 1
      expect(room.stats['socket-1'].playerGames).toBe(4); // 2 + 2
    });
  });
});
