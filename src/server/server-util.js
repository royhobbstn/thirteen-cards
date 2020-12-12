//

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
  if (assignRank > room.startingPlayers) {
    assignRank = room.startingPlayers;
  }
  return assignRank;
}

function findRanksAvailable(room) {
  const ranksAvailable = [1, 2, 3, 4];
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

export function resetGame(room, sendToEveryone) {
  console.log('no more remaining players');
  if (room.stage === 'game') {
    console.log('setting to done');
    room.stage = 'done';
    setTimeout(() => {
      // reset
      console.log('resetting');
      room.stats = {};
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
      console.log('sending');
      sendToEveryone(io, roomName, room);
    }, 5000);
  }
}

export function countRemainingPlayers(room) {
  // mark game as over if all warm seats have a rank
  let remainingPlayers = 0;
  for (let [i, v] of room.seated.entries()) {
    console.log({ i, v, rank: room.rank[i] });
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
