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

export const AI_PERSONAS = [
  'marcus',
  'eddie',
  'grandmaliu',
  'victor',
  'sophie',
  'frank',
  'ada',
  'meilin',
];

export const AI_DISPLAY_NAMES = {
  marcus: 'Marcus (Balanced)',
  eddie: 'Eddie (Aggressive)',
  grandmaliu: 'Grandma Liu (Conservative)',
  victor: 'Victor (Bomb Collector)',
  sophie: 'Sophie (Straight Specialist)',
  frank: 'Uncle Frank (Psychological)',
  ada: 'Professor Ada (Mathematical)',
  meilin: 'Mei-Lin (Endgame Specialist)',
};

export const AI_PERSONA_DESCRIPTIONS = {
  marcus:
    'A well-rounded player who balances offense and defense. Makes calculated plays and adapts to the game state.',
  eddie:
    'An aggressive player who plays fast and uses high cards early. Aims to finish quickly at the risk of running out of strong cards.',
  grandmaliu:
    'A patient, conservative player who saves high cards for later. Plays defensively and waits for the right moment.',
  victor:
    'A tactical player who protects 3-of-a-kinds to build bombs. Saves bombs for critical moments and finishes explosively.',
  sophie:
    'A sequence specialist who builds and protects straights. Prefers playing long consecutive runs over other combinations.',
  frank:
    'An unpredictable player with variable timing. Uses strategic passes to bait opponents and occasional power plays to intimidate.',
  ada:
    'A methodical player who calculates efficiency for every play. Maximizes card elimination while preserving high-value cards.',
  meilin:
    'A patient strategist who conserves resources early and dominates the endgame. Shifts to aggressive mode when victory is near.',
};

// Theme helpers

/**
 * Get saved theme preference or 'system' for auto
 * @returns {'light' | 'dark' | 'system'}
 */
export function getSafeTheme() {
  const theme = localStorage.getItem('theme');
  if (theme === 'light' || theme === 'dark') return theme;
  return 'system';
}

/**
 * Apply theme to document
 * @param {'light' | 'dark' | 'system'} theme
 */
export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
  localStorage.setItem('theme', theme);
}

/**
 * Get initials from a name (max 2 characters)
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(p => p.length > 0);
  if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/**
 * Format a relative timestamp
 * @param {Date|number} date
 * @returns {string}
 */
export function formatRelativeTime(date) {
  if (date == null) return '';

  const now = Date.now();
  const then = date instanceof Date ? date.getTime() : date;

  // Handle invalid dates
  if (!Number.isFinite(then)) return '';

  const diffMs = now - then;

  // Handle future dates (show as "now")
  if (diffMs < 0) return 'now';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 5) return 'now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(then).toLocaleDateString();
}
