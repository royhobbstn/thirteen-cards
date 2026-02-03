// Test fixtures for room state

/**
 * Create a minimal mock room for testing
 * @param {object} overrides - Properties to override
 * @returns {object} Mock room state
 */
export function createMockRoom(overrides = {}) {
  return {
    stage: 'game',
    gameId: 'test-game-123',
    seated: [null, null, null, null],
    players: [],
    aliases: {},
    colors: {},
    cards: [null, null, null, null],
    board: [],
    lowest: '3c',
    initial: true,
    turnIndex: 0,
    submitted: [],
    last: [null, null, null, null],
    lastPassSeat: null,
    rank: [null, null, null, null],
    startingPlayers: 0,
    stats: {},
    lastModified: Date.now(),
    ...overrides,
  };
}

/**
 * Create a room with players seated
 * @param {number} playerCount - Number of players (2-4)
 * @param {object} overrides - Additional overrides
 * @returns {object} Mock room with players
 */
export function createGameRoom(playerCount = 2, overrides = {}) {
  const socketIds = ['socket-1', 'socket-2', 'socket-3', 'socket-4'].slice(0, playerCount);
  const seated = [null, null, null, null];
  const aliases = {};
  const colors = {};
  const stats = {};
  const cards = [null, null, null, null];

  // Seat players at alternating positions for 2 players
  const seatPositions =
    playerCount === 2 ? [0, 2] : playerCount === 3 ? [0, 1, 2] : [0, 1, 2, 3];

  socketIds.forEach((socketId, i) => {
    const seatIndex = seatPositions[i];
    seated[seatIndex] = socketId;
    aliases[socketId] = `Player ${i + 1}`;
    colors[socketId] = '#ff0000';
    stats[socketId] = {
      points: 0,
      playerGames: 0,
      games: 0,
      first: 0,
      second: 0,
      third: 0,
      fourth: 0,
      bombs: 0,
    };
    cards[seatIndex] = [];
  });

  return createMockRoom({
    seated,
    players: socketIds,
    aliases,
    colors,
    cards,
    stats,
    startingPlayers: playerCount,
    ...overrides,
  });
}

/**
 * Create a room with AI players
 * @param {string[]} personas - AI persona names
 * @param {number} humanCount - Number of human players
 * @returns {object} Mock room with AI players
 */
export function createAiRoom(personas = ['marcus'], humanCount = 1, overrides = {}) {
  const room = createGameRoom(humanCount, overrides);

  // Add AI players to empty seats
  let aiIndex = 0;
  for (let i = 0; i < 4 && aiIndex < personas.length; i++) {
    if (room.seated[i] === null) {
      const persona = personas[aiIndex];
      const aiSeatId = `--${persona}`;
      room.seated[i] = aiSeatId;
      room.aliases[aiSeatId] = `${persona} (AI)`;
      room.colors[aiSeatId] = '#0000ff';
      room.stats[aiSeatId] = {
        points: 0,
        playerGames: 0,
        games: 0,
        first: 0,
        second: 0,
        third: 0,
        fourth: 0,
        bombs: 0,
      };
      room.cards[i] = [];
      room.startingPlayers++;
      aiIndex++;
    }
  }

  return room;
}

/**
 * Create a room in mid-game state
 * @param {object} options - Configuration options
 * @returns {object} Mock room in game
 */
export function createMidGameRoom({
  playerCount = 2,
  turnIndex = 0,
  boardCards = [],
  lastPlays = [null, null, null, null],
  playerHands = null,
} = {}) {
  const room = createGameRoom(playerCount, {
    initial: false,
    turnIndex,
    board: boardCards,
    last: lastPlays,
  });

  if (playerHands) {
    Object.entries(playerHands).forEach(([seatIndex, hand]) => {
      room.cards[parseInt(seatIndex)] = hand;
    });
  }

  return room;
}

/**
 * Create a room where game is almost over
 * @param {number} remainingPlayers - Players without a rank
 * @returns {object} Mock room near end
 */
export function createEndGameRoom(remainingPlayers = 2) {
  const room = createGameRoom(4);

  // Assign ranks to finished players
  const ranks = [1, 2, 3, 4];
  let rankIndex = 0;
  for (let i = 0; i < 4 && rankIndex < 4 - remainingPlayers; i++) {
    if (room.seated[i]) {
      room.rank[i] = ranks[rankIndex++];
      room.cards[i] = null;
    }
  }

  return room;
}

// Sample detection objects for testing
export const DETECTIONS = {
  single3c: { name: '3 of Clubs', play: 'Singles', rank: 1 },
  single2s: { name: '2 of Spades', play: 'Singles', rank: 52 },
  pairThrees: { name: 'Pair of 3s', play: 'One Pair', rank: 4 },
  pairTwos: { name: 'Pair of 2s', play: 'One Pair', rank: 52 },
  tripleAces: { name: 'Three Aces', play: 'Three of a Kind', rank: 48 },
  bomb: { name: 'Four Aces', play: 'Bomb', rank: 100 }, // High rank bomb for testing
  fiveCardStraight: { name: '3-7 Straight', play: '5 Card Straight', rank: 20 },
  flush: { name: 'Club Flush', play: 'Flush', rank: 33 },
  fullHouse: { name: 'Full House', play: 'Full House', rank: 12 },
  straightFlush: { name: 'Straight Flush', play: 'Straight Flush', rank: 20 },
  freePlay: { name: 'Free Play', play: 'Free Play', rank: 0 },
  invalid: { name: '', play: '---', rank: 0 },
};
