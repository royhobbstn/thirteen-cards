export function getSeatIndex(gameData, socketRef) {
  let seatIndex = null;
  for (let i = 0; i < gameData.seated.length; i++) {
    if (gameData.seated[i] === socketRef.current.id) {
      seatIndex = i;
    }
  }
  return seatIndex;
}

export function getLastPlay(gameData, seatIndex) {
  let lastPlay = null;

  // find previous 3 players actions
  for (let i = 1; i <= 3; i++) {
    let currentIndex = seatIndex - i;
    if (currentIndex < 0) {
      currentIndex = currentIndex + 4;
    }
    if (gameData.last[currentIndex] !== null && gameData.last[currentIndex] !== 'pass') {
      lastPlay = gameData.last[currentIndex];
      break;
    }
  }

  if (!lastPlay) {
    return { name: 'Free Play', play: 'Free Play', rank: 0 };
  }

  return lastPlay;
}

export function isFreePlay(gameData, seatIndex) {
  const lastPlay = getLastPlay(gameData, seatIndex);
  return lastPlay.play === 'Free Play';
}

export function restrictPlay(gameData, seatIndex, detectedHand) {
  // enforce game rules here
  // false = okay to play
  // true = disable submit button

  const lastPlay = getLastPlay(gameData, seatIndex);

  if (lastPlay.play === 'Free Play') {
    return false;
  }

  // this section allows bombs to be played on anything
  // and straight flushes to be played on Straights or Flushes
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

  if (playTypeValidation && detectedHand.rank > lastPlay.rank) {
    return false;
  }

  return true;
}

export function missingLowCard(gameData, scratchState) {
  return gameData.initial && !scratchState.some(card => card.id === gameData.lowest);
}

export function getSafeUserName() {
  const userName = localStorage.getItem('userName');
  if (typeof userName !== 'string') return '';
  return userName.slice(0, 50);
}

export function getSafeColorChoice() {
  const colorChoice = localStorage.getItem('colorChoice');
  if (typeof colorChoice !== 'string') return null;
  if (!/^#[0-9a-fA-F]{6}$/.test(colorChoice)) return null;
  return colorChoice;
}

export function getSafeLastKnownSocket() {
  const lastKnownSocket = localStorage.getItem('lastKnownSocket');
  if (typeof lastKnownSocket !== 'string') return null;
  if (lastKnownSocket.length > 100) return null;
  return lastKnownSocket;
}

// AI Helpers

/**
 * Check if a seat ID represents an AI player
 * @param {string} seatId - Seat ID from gameData.seated[]
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

export const AI_PERSONAS = ['marcus', 'eddie', 'grandmaliu'];

export const AI_DISPLAY_NAMES = {
  marcus: 'Marcus (Balanced)',
  eddie: 'Eddie (Aggressive)',
  grandmaliu: 'Grandma Liu (Conservative)',
};
