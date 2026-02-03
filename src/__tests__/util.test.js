import {
  getSeatIndex,
  getLastPlay,
  isFreePlay,
  restrictPlay,
  missingLowCard,
  getSafeUserName,
  getSafeColorChoice,
  getSafeLastKnownSocket,
  isAiSeat,
  getAiPersona,
  getInitials,
  formatRelativeTime,
  getSafeTheme,
  applyTheme,
} from '../util.js';
import { DETECTIONS } from '../testFixtures/rooms.js';

// Mock localStorage for tests
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: key => store[key] || null,
    setItem: (key, value) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock document for theme tests
const mockDocument = {
  documentElement: {
    setAttribute: jest.fn(),
    removeAttribute: jest.fn(),
  },
};
Object.defineProperty(global, 'document', { value: mockDocument, writable: true });

describe('getSeatIndex', () => {
  it('returns seat index for seated player', () => {
    const socketRef = { current: { id: 'socket-123' } };
    const gameData = {
      seated: [null, 'socket-123', null, null],
    };
    expect(getSeatIndex(gameData, socketRef)).toBe(1);
  });

  it('returns null if player not seated', () => {
    const socketRef = { current: { id: 'socket-123' } };
    const gameData = {
      seated: [null, 'other-socket', null, null],
    };
    expect(getSeatIndex(gameData, socketRef)).toBeNull();
  });

  it('handles empty seated array', () => {
    const socketRef = { current: { id: 'socket-123' } };
    const gameData = {
      seated: [null, null, null, null],
    };
    expect(getSeatIndex(gameData, socketRef)).toBeNull();
  });
});

describe('getLastPlay', () => {
  it('returns Free Play when no previous plays', () => {
    const gameData = {
      last: [null, null, null, null],
    };
    const result = getLastPlay(gameData, 0);
    expect(result.play).toBe('Free Play');
  });

  it('finds previous play from another player', () => {
    const gameData = {
      last: [DETECTIONS.pairThrees, null, null, null],
    };
    const result = getLastPlay(gameData, 1);
    expect(result).toEqual(DETECTIONS.pairThrees);
  });

  it('skips passes to find actual play', () => {
    const gameData = {
      last: [DETECTIONS.single3c, 'pass', 'pass', null],
    };
    const result = getLastPlay(gameData, 3);
    expect(result).toEqual(DETECTIONS.single3c);
  });

  it('wraps around the table correctly', () => {
    const gameData = {
      last: [null, null, null, DETECTIONS.tripleAces],
    };
    const result = getLastPlay(gameData, 0);
    expect(result).toEqual(DETECTIONS.tripleAces);
  });

  it('returns Free Play when all previous are passes', () => {
    const gameData = {
      last: ['pass', 'pass', 'pass', null],
    };
    const result = getLastPlay(gameData, 3);
    expect(result.play).toBe('Free Play');
  });
});

describe('isFreePlay', () => {
  it('returns true when no cards on board', () => {
    const gameData = {
      last: [null, null, null, null],
    };
    expect(isFreePlay(gameData, 0)).toBe(true);
  });

  it('returns false when there is a play on board', () => {
    const gameData = {
      last: [DETECTIONS.pairThrees, null, null, null],
    };
    expect(isFreePlay(gameData, 1)).toBe(false);
  });
});

describe('restrictPlay', () => {
  describe('free play', () => {
    it('returns false (allowed) on free play', () => {
      const gameData = {
        last: [null, null, null, null],
      };
      expect(restrictPlay(gameData, 0, DETECTIONS.single3c)).toBe(false);
    });
  });

  describe('same type plays', () => {
    it('allows higher single over lower single', () => {
      const gameData = {
        last: [DETECTIONS.single3c, null, null, null],
      };
      expect(restrictPlay(gameData, 1, DETECTIONS.single2s)).toBe(false);
    });

    it('restricts lower single over higher single', () => {
      const gameData = {
        last: [DETECTIONS.single2s, null, null, null],
      };
      expect(restrictPlay(gameData, 1, DETECTIONS.single3c)).toBe(true);
    });

    it('allows higher pair over lower pair', () => {
      const gameData = {
        last: [DETECTIONS.pairThrees, null, null, null],
      };
      expect(restrictPlay(gameData, 1, DETECTIONS.pairTwos)).toBe(false);
    });
  });

  describe('bombs', () => {
    it('allows bomb on any play type', () => {
      const gameData = {
        last: [DETECTIONS.pairTwos, null, null, null],
      };
      expect(restrictPlay(gameData, 1, DETECTIONS.bomb)).toBe(false);
    });

    it('allows bomb on singles', () => {
      const gameData = {
        last: [DETECTIONS.single2s, null, null, null],
      };
      expect(restrictPlay(gameData, 1, DETECTIONS.bomb)).toBe(false);
    });
  });

  describe('straight flush', () => {
    it('allows straight flush on straight', () => {
      const gameData = {
        last: [DETECTIONS.fiveCardStraight, null, null, null],
      };
      const highStraightFlush = { ...DETECTIONS.straightFlush, rank: 150 };
      expect(restrictPlay(gameData, 1, highStraightFlush)).toBe(false);
    });

    it('allows straight flush on flush', () => {
      const gameData = {
        last: [DETECTIONS.flush, null, null, null],
      };
      const highStraightFlush = { ...DETECTIONS.straightFlush, rank: 150 };
      expect(restrictPlay(gameData, 1, highStraightFlush)).toBe(false);
    });
  });

  describe('mismatched types', () => {
    it('restricts single on pair', () => {
      const gameData = {
        last: [DETECTIONS.pairThrees, null, null, null],
      };
      expect(restrictPlay(gameData, 1, DETECTIONS.single2s)).toBe(true);
    });

    it('restricts pair on triple', () => {
      const gameData = {
        last: [DETECTIONS.tripleAces, null, null, null],
      };
      expect(restrictPlay(gameData, 1, DETECTIONS.pairTwos)).toBe(true);
    });
  });
});

describe('missingLowCard', () => {
  it('returns false when not initial play', () => {
    const gameData = { initial: false, lowest: '3c' };
    const scratchState = [{ id: '4d' }];
    expect(missingLowCard(gameData, scratchState)).toBe(false);
  });

  it('returns false when lowest card is included', () => {
    const gameData = { initial: true, lowest: '3c' };
    const scratchState = [{ id: '3c' }, { id: '4d' }];
    expect(missingLowCard(gameData, scratchState)).toBe(false);
  });

  it('returns true when lowest card is missing on initial', () => {
    const gameData = { initial: true, lowest: '3c' };
    const scratchState = [{ id: '4d' }, { id: '5h' }];
    expect(missingLowCard(gameData, scratchState)).toBe(true);
  });
});

describe('getSafeUserName', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty string when no userName', () => {
    expect(getSafeUserName()).toBe('');
  });

  it('returns stored userName', () => {
    localStorage.setItem('userName', 'TestUser');
    expect(getSafeUserName()).toBe('TestUser');
  });

  it('truncates long usernames to 50 chars', () => {
    const longName = 'a'.repeat(100);
    localStorage.setItem('userName', longName);
    expect(getSafeUserName().length).toBe(50);
  });
});

describe('getSafeColorChoice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no colorChoice', () => {
    expect(getSafeColorChoice()).toBeNull();
  });

  it('returns valid hex color', () => {
    localStorage.setItem('colorChoice', '#ff0000');
    expect(getSafeColorChoice()).toBe('#ff0000');
  });

  it('returns null for invalid hex format (missing #)', () => {
    localStorage.setItem('colorChoice', 'ff0000');
    expect(getSafeColorChoice()).toBeNull();
  });

  it('returns null for invalid hex format (wrong length)', () => {
    localStorage.setItem('colorChoice', '#fff');
    expect(getSafeColorChoice()).toBeNull();
  });

  it('returns null for invalid hex format (non-hex chars)', () => {
    localStorage.setItem('colorChoice', '#gggggg');
    expect(getSafeColorChoice()).toBeNull();
  });

  it('accepts uppercase hex', () => {
    localStorage.setItem('colorChoice', '#FF00AA');
    expect(getSafeColorChoice()).toBe('#FF00AA');
  });
});

describe('getSafeLastKnownSocket', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no lastKnownSocket', () => {
    expect(getSafeLastKnownSocket()).toBeNull();
  });

  it('returns stored socket id', () => {
    localStorage.setItem('lastKnownSocket', 'socket-abc123');
    expect(getSafeLastKnownSocket()).toBe('socket-abc123');
  });

  it('returns null for excessively long socket ids', () => {
    localStorage.setItem('lastKnownSocket', 'a'.repeat(101));
    expect(getSafeLastKnownSocket()).toBeNull();
  });

  it('accepts socket id at max length', () => {
    const maxLengthSocket = 'a'.repeat(100);
    localStorage.setItem('lastKnownSocket', maxLengthSocket);
    expect(getSafeLastKnownSocket()).toBe(maxLengthSocket);
  });
});

describe('isAiSeat', () => {
  it('returns true for AI seat IDs', () => {
    expect(isAiSeat('--marcus')).toBe(true);
    expect(isAiSeat('--eddie')).toBe(true);
  });

  it('returns false for human socket IDs', () => {
    expect(isAiSeat('socket-123')).toBe(false);
    expect(isAiSeat(null)).toBe(false);
    expect(isAiSeat('')).toBe(false);
  });
});

describe('getAiPersona', () => {
  it('extracts persona name from AI seat ID', () => {
    expect(getAiPersona('--marcus')).toBe('marcus');
    expect(getAiPersona('--grandmaliu')).toBe('grandmaliu');
  });

  it('returns null for non-AI seat', () => {
    expect(getAiPersona('socket-123')).toBe(null);
    expect(getAiPersona(null)).toBe(null);
  });
});

describe('getInitials', () => {
  it('returns initials from two-word name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('returns first two letters for single word', () => {
    expect(getInitials('Marcus')).toBe('MA');
  });

  it('handles empty/null names', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials(null)).toBe('?');
    expect(getInitials(undefined)).toBe('?');
  });

  it('handles whitespace-only names', () => {
    expect(getInitials('   ')).toBe('?');
  });

  it('handles names with extra whitespace', () => {
    expect(getInitials('  John   Doe  ')).toBe('JD');
  });

  it('returns uppercase initials', () => {
    expect(getInitials('john doe')).toBe('JD');
  });

  it('handles names with more than two words', () => {
    expect(getInitials('John Middle Doe')).toBe('JM');
  });
});

describe('formatRelativeTime', () => {
  it('returns "now" for very recent times', () => {
    const now = Date.now();
    expect(formatRelativeTime(now)).toBe('now');
    expect(formatRelativeTime(now - 1000)).toBe('now'); // 1 second ago
  });

  it('returns seconds for times < 60s ago', () => {
    const thirtySecondsAgo = Date.now() - 30000;
    expect(formatRelativeTime(thirtySecondsAgo)).toBe('30s ago');
  });

  it('returns minutes for times < 60min ago', () => {
    const tenMinutesAgo = Date.now() - 600000;
    expect(formatRelativeTime(tenMinutesAgo)).toBe('10m ago');
  });

  it('returns hours for times < 24h ago', () => {
    const twoHoursAgo = Date.now() - 7200000;
    expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
  });

  it('returns date for older times', () => {
    const twoDaysAgo = Date.now() - 172800000;
    const result = formatRelativeTime(twoDaysAgo);
    // Should be a date string, not "Xh ago"
    expect(result).not.toContain('h ago');
    expect(result).not.toContain('m ago');
  });

  it('handles null/undefined', () => {
    expect(formatRelativeTime(null)).toBe('');
    expect(formatRelativeTime(undefined)).toBe('');
  });

  it('handles Date objects', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('now');
  });

  it('returns "now" for future dates', () => {
    const future = Date.now() + 60000;
    expect(formatRelativeTime(future)).toBe('now');
  });
});

describe('getSafeTheme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns "system" when no theme set', () => {
    expect(getSafeTheme()).toBe('system');
  });

  it('returns "light" when light theme set', () => {
    localStorage.setItem('theme', 'light');
    expect(getSafeTheme()).toBe('light');
  });

  it('returns "dark" when dark theme set', () => {
    localStorage.setItem('theme', 'dark');
    expect(getSafeTheme()).toBe('dark');
  });

  it('returns "system" for invalid theme values', () => {
    localStorage.setItem('theme', 'invalid');
    expect(getSafeTheme()).toBe('system');
  });

  it('returns "system" for empty string', () => {
    localStorage.setItem('theme', '');
    expect(getSafeTheme()).toBe('system');
  });
});

describe('applyTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    mockDocument.documentElement.setAttribute.mockClear();
    mockDocument.documentElement.removeAttribute.mockClear();
  });

  it('sets data-theme attribute for light theme', () => {
    applyTheme('light');
    expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('sets data-theme attribute for dark theme', () => {
    applyTheme('dark');
    expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('removes data-theme attribute for system theme', () => {
    applyTheme('system');
    expect(mockDocument.documentElement.removeAttribute).toHaveBeenCalledWith('data-theme');
    expect(localStorage.getItem('theme')).toBe('system');
  });
});
