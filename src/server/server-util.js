//

/**
 * Check if a seat ID represents an AI player
 * @param {string} seatId - Seat ID from room.seated[]
 * @returns {boolean}
 */
export function isAiSeat(seatId) {
  return typeof seatId === 'string' && seatId.startsWith('--');
}

/**
 * Get the AI persona from a seat ID
 * @param {string} seatId - Seat ID like '--marcus'
 * @returns {string|null} Persona name like 'marcus'
 */
export function getAiPersona(seatId) {
  if (!isAiSeat(seatId)) return null;
  return seatId.slice(2);
}

export function findLowestAvailableRank(room) {
  const ranksAvailable = findRanksAvailable(room);
  let assignRank = 0;
  for (let value of ranksAvailable) {
    if (value !== null) {
      assignRank = value;
      break;
    }
  }
  return assignRank;
}
//

export function findHighestAvailableRank(room) {
  const ranksAvailable = findRanksAvailable(room);
  let assignRank = 0;
  for (let value of ranksAvailable) {
    if (value !== null && value > assignRank) {
      assignRank = value;
    }
  }

  return assignRank;
}

function findRanksAvailable(room) {
  const ranksAvailable = [1, 2, 3, 4].map(r => {
    if (r > room.startingPlayers) {
      return null;
    }
    return r;
  });
  for (let value of room.rank) {
    if (value === 1) {
      ranksAvailable[0] = null;
    } else if (value === 2) {
      ranksAvailable[1] = null;
    } else if (value === 3) {
      ranksAvailable[2] = null;
    } else if (value === 4) {
      ranksAvailable[3] = null;
    }
  }
  return ranksAvailable;
}

export function resetGame(room, sendToEveryone, io) {
  if (room.stage === 'game') {
    room.stage = 'done';
    room.cards = [null, null, null, null];
    setTimeout(() => {
      // Guard against unexpected state changes during timeout
      if (room.stage !== 'done') {
        return;
      }
      // reset
      room.stage = 'seating';
      room.rank = [null, null, null, null];
      room.cards = [null, null, null, null];
      room.submitted = [];
      room.last = [null, null, null, null];
      room.initial = true;
      room.lowest = null;
      room.turnIndex = 0;
      room.board = [];
      room.gameId = 0;
      // Clean up disconnected seats
      room.seated = room.seated.map(seat => (seat === 'disconnected' ? null : seat));
      sendToEveryone(io, room);
    }, 5000);
  }
}

export function countRemainingPlayers(room) {
  // mark game as over if all warm seats have a rank
  let remainingPlayers = 0;
  for (let [i, v] of room.seated.entries()) {
    // if seat is warm and has no cards and no rank
    if (v && !room.rank[i]) {
      remainingPlayers++;
    }
  }
  return remainingPlayers;
}

export function findOrphanedSeat(room) {
  // is there an orphaned player in the game with no opponent?
  // assign them last place (or 2nd place in heads up, etc)
  let orphanedSeatIndex;
  let orphanedSeatCount = 0;
  for (let [i, v] of room.seated.entries()) {
    // if seat is warm and has no rank
    if (v && !room.rank[i]) {
      orphanedSeatCount++;
      orphanedSeatIndex = i;
    }
  }
  return [orphanedSeatCount, orphanedSeatIndex];
}

export function findSeatIndex(room, socketId) {
  let seatIndex = room.seated.reduce((acc, seatSocket, index) => {
    if (seatSocket === socketId) {
      acc = index;
    }
    return acc;
  }, null);
  return seatIndex;
}

export function assignGamePoints(room, assignRank) {
  return room.startingPlayers - assignRank + 1;
}

// Validation functions for submitHand

export function validateTurn(room, socketId) {
  const seatIndex = findSeatIndex(room, socketId);
  return seatIndex === room.turnIndex;
}

export function validateOwnsCards(room, socketId, submittedCards) {
  const seatIndex = findSeatIndex(room, socketId);
  if (seatIndex === null) return false;
  const playerCards = room.cards[seatIndex];
  if (!playerCards) return false;
  return submittedCards.every(card => playerCards.includes(card));
}

export function validateInitialPlay(room, submittedCards) {
  if (!room.initial) return true;
  return submittedCards.includes(room.lowest);
}

export function getLastPlay(room, seatIndex) {
  for (let i = 1; i <= 3; i++) {
    let currentIndex = seatIndex - i;
    if (currentIndex < 0) {
      currentIndex = currentIndex + 4;
    }
    if (room.last[currentIndex] !== null && room.last[currentIndex] !== 'pass') {
      return room.last[currentIndex];
    }
  }
  return { name: 'Free Play', play: 'Free Play', rank: 0 };
}

export function validatePlayBeatsBoard(room, seatIndex, detectedHand) {
  const lastPlay = getLastPlay(room, seatIndex);

  if (lastPlay.play === 'Free Play') {
    return true;
  }

  let playTypeValidation = false;
  if (detectedHand.play === lastPlay.play) {
    playTypeValidation = true;
  }
  if (detectedHand.play === 'Bomb') {
    playTypeValidation = true;
  }
  // Straight Flush can beat any Straight (e.g., "5 Card Straight") or Flush
  if (lastPlay.play.includes('Straight') && !lastPlay.play.includes('Flush') && detectedHand.play === 'Straight Flush') {
    playTypeValidation = true;
  }
  if (lastPlay.play === 'Flush' && detectedHand.play === 'Straight Flush') {
    playTypeValidation = true;
  }

  return playTypeValidation && detectedHand.rank > lastPlay.rank;
}

export function shouldClearBoard(room) {
  // Check if all active players (those without a rank) have passed
  // except possibly the last one who played
  let lastPlayerIndex = -1;
  let activePlayers = 0;
  let passCount = 0;

  for (let i = 0; i < room.seated.length; i++) {
    const seat = room.seated[i];
    // Skip empty seats, disconnected players, and players who have finished
    if (!seat || seat === 'disconnected' || room.rank[i]) {
      continue;
    }
    activePlayers++;

    if (room.last[i] === 'pass') {
      passCount++;
    } else if (room.last[i] !== null) {
      // This player played cards (not null, not 'pass')
      lastPlayerIndex = i;
    }
  }

  // If all active players except one have passed, and that one played (not passed),
  // then clear the board
  return activePlayers > 1 && passCount === activePlayers - 1 && lastPlayerIndex !== -1;
}

export function clearBoardForFreePlay(room) {
  room.board = [];
  room.last = [null, null, null, null];
}

export function replaceSocketId(room, oldSocketId, newSocketId) {
  // Replace in seated array
  room.seated = room.seated.map(seat => (seat === oldSocketId ? newSocketId : seat));

  // Replace in players array
  room.players = room.players.map(player => (player === oldSocketId ? newSocketId : player));

  // Replace in aliases object
  if (room.aliases[oldSocketId] !== undefined) {
    room.aliases[newSocketId] = room.aliases[oldSocketId];
    delete room.aliases[oldSocketId];
  }

  // Replace in colors object
  if (room.colors[oldSocketId] !== undefined) {
    room.colors[newSocketId] = room.colors[oldSocketId];
    delete room.colors[oldSocketId];
  }

  // Replace in stats object
  if (room.stats[oldSocketId] !== undefined) {
    room.stats[newSocketId] = room.stats[oldSocketId];
    delete room.stats[oldSocketId];
  }
}
