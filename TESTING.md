# Unit Testing Plan for Thirteen Cards

## Overview

Establish comprehensive unit testing to protect game logic during upcoming architectural changes. This involves setting up test infrastructure, refactoring tightly-coupled code for testability, and writing tests in priority order.

## Current State

- **No tests exist** - Jest/Testing Library installed via CRA but zero test files
- **No test script** in package.json
- **Good foundation** - Many pure functions already testable
- **Problem areas** - Socket.io handlers mix business logic with side effects

---

## Phase 1: Test Infrastructure Setup

### 1.1 Add test scripts to `package.json`
```json
"scripts": {
  "test": "react-scripts test",
  "test:coverage": "react-scripts test --coverage --watchAll=false"
}
```

### 1.2 Create test fixtures directory
- `src/__tests__/fixtures/cards.js` - Sample hands (pairs, straights, bombs, etc.)
- `src/__tests__/fixtures/rooms.js` - Mock room state factory

### 1.3 Test file structure
```
src/
├── cardUtils/__tests__/
│   ├── cards.test.js
│   ├── detectedCards.test.js
│   └── detectors.test.js
├── server/__tests__/
│   ├── server-util.test.js
│   └── gameStateManager.test.js
├── server/ai/__tests__/
│   ├── cardEvaluator.test.js
│   ├── handAnalyzer.test.js
│   └── strategies.test.js
└── __tests__/
    ├── fixtures/
    └── util.test.js
```

---

## Phase 2: Refactoring for Testability

### 2.1 Extract duplicated `findNextPlayersTurn()` (HIGH PRIORITY)
- **Current:** Duplicated in `app.js:675` and `ai/index.js:230`
- **Action:** Move to `server-util.js`, import in both files
- **Files:** `server-util.js`, `app.js`, `ai/index.js`

### 2.2 Extract rank assignment logic (HIGH PRIORITY)
- **Current:** Duplicated in `submitHand`, `forfeit`, `executeAiPlay` (3+ places)
- **Action:** Create `assignRankToPlayer(room, seatIndex, rank)` in `server-util.js`
- **Files:** `server-util.js`, `app.js`, `ai/index.js`

### 2.3 Create `gameStateManager.js` (MEDIUM PRIORITY)
Extract from `setGameStatus` handler:
- `dealCards(numPlayers)` - Pure function returning dealt hands
- `determineFirstPlayer(cards)` - Returns seat index with lowest card
- `initializeGameState(room)` - Orchestrates game start

### 2.4 Create `playHandler.js` (MEDIUM PRIORITY)
Extract from `submitHand` handler:
- `processCardPlay(room, seatIndex, cards, detection)` - Returns new state
- `checkWinCondition(room, seatIndex)` - Returns win status
- `handleOrphanedPlayer(room)` - Returns orphan handling result

### 2.5 Convert mutations to return new state (LOW PRIORITY)
- `clearBoardForFreePlay()` - Return new room instead of mutating
- `replaceSocketId()` - Return new room instead of mutating
- `resetGame()` - Remove unused params, return new state

---

## Phase 3: Test Implementation (Priority Order)

### 3.1 Card Utilities (HIGHEST PRIORITY)
**Files:** `src/cardUtils/`

| Function | Tests |
|----------|-------|
| `getDetectedCards()` | Singles, pairs, triples, quads, straights (3-13), flushes, full houses, straight flushes, invalid hands |
| `createSuitMap()` | Grouping, empty array |
| `createFaceMap()` | Grouping, empty array |
| `getConsecutiveness()` | Valid straights, gaps, 2s excluded |

### 3.2 Server Utilities (HIGH PRIORITY)
**File:** `src/server/server-util.js`

| Function | Tests |
|----------|-------|
| `isAiSeat()` | AI seats (`--marcus`), human sockets, null |
| `getAiPersona()` | Extract persona name |
| `findLowestAvailableRank()` | No ranks, partial ranks, full |
| `findHighestAvailableRank()` | Based on player count |
| `validateTurn()` | Correct turn, wrong turn |
| `validateOwnsCards()` | Owns all, missing cards |
| `validateInitialPlay()` | Contains lowest, missing lowest |
| `validatePlayBeatsBoard()` | Same type higher rank, bombs, free play |
| `shouldClearBoard()` | All passed, some active |
| `getLastPlay()` | Find last non-pass |
| `findNextPlayersTurn()` | Skip finished players, wrap around |
| `assignRankToPlayer()` | Stats updates, placement tracking |

### 3.3 AI Card Evaluator (HIGH PRIORITY)
**File:** `src/server/ai/cardEvaluator.js`

| Function | Tests |
|----------|-------|
| `scoreCard()` | Low cards (3c=1), high cards (2s=20.75), suit bonuses |
| `evaluatePlay()` | Type multipliers, 2s penalty, invalid plays |
| `isHighCard()` | Aces, 2s, others |
| `isTwo()` | 2s only |

### 3.4 AI Hand Analyzer (HIGH PRIORITY)
**File:** `src/server/ai/handAnalyzer.js`

| Function | Tests |
|----------|-------|
| `analyzeHand()` | Full hand analysis, initial constraint, board constraint |
| `generateAllPlays()` | All play types generated |
| `playBeatsBoard()` | Type matching, rank comparison |
| `combinations()` | n choose k |
| `cartesianProduct()` | Product computation |

### 3.5 AI Strategies (MEDIUM PRIORITY)
**Files:** `src/server/ai/strategies/`

| Strategy | Key Tests |
|----------|-----------|
| `BaseStrategy` | `choosePlay()`, `getOpponentCardCounts()`, `isAnyOpponentLow()` |
| `MarcusStrategy` | Balanced play, bomb conservation |
| `EddieStrategy` | Aggressive, fast timing |
| `GrandmaLiuStrategy` | Conservative, saves high cards |
| Others (5 more) | Persona-specific behaviors |

### 3.6 Client Utilities (MEDIUM PRIORITY)
**File:** `src/util.js`

| Function | Tests |
|----------|-------|
| `getLastPlay()` | Find last play, free play |
| `restrictPlay()` | Type matching, bombs, initial play |
| `missingLowCard()` | Initial constraint |
| `getSafeUserName()` | Truncation, sanitization |
| `getInitials()` | Two initials, single word |

---

## Phase 4: Integration Tests

**File:** `src/__tests__/gameFlow.test.js`

- Complete 2-player game flow
- 4-player game with turn rotation
- Board clearing mechanics
- Orphaned player handling
- AI turn integration

---

## Critical Files

| File | Action |
|------|--------|
| `src/server/server-util.js` | Add extracted functions, write tests |
| `src/cardUtils/detectedCards.js` | Write comprehensive detection tests |
| `src/server/ai/handAnalyzer.js` | Write play generation tests |
| `src/server/ai/cardEvaluator.js` | Write scoring tests |
| `src/server/app.js` | Extract logic to new modules |

---

## Verification Plan

1. **Run tests:** `npm test` - All tests pass
2. **Check coverage:** `npm run test:coverage` - Target 80%+ on core modules
3. **Manual smoke test:** Play a full game with AI to verify no regressions
4. **Verify refactored code:** Ensure game behavior unchanged after extractions

---

## Execution Order

1. **Setup** - Add test scripts, create fixtures
2. **Quick wins** - Test pure functions in `cardUtils/` and `server-util.js`
3. **Refactor** - Extract `findNextPlayersTurn()` and rank assignment
4. **AI tests** - Card evaluator and hand analyzer
5. **More refactoring** - Create `gameStateManager.js` and `playHandler.js`
6. **Strategy tests** - All 8 AI personas
7. **Integration** - Full game flow tests
