# AI Players Implementation Plan

## Overview

Add computer-controlled AI players to Thirteen Cards with three distinct personas: Marcus (balanced), Eddie (aggressive), and Grandma Liu (conservative). AI players occupy seats, play automatically with strategic delays, and integrate seamlessly with the existing game flow.

---

## File Structure

```
src/server/ai/           # NEW DIRECTORY
├── index.js             # Main controller - processAiTurn(), isAiSeat()
├── handAnalyzer.js      # Generate all valid plays from a hand
├── cardEvaluator.js     # Score cards/combinations for strategy decisions
└── strategies/
    ├── index.js         # Strategy factory and AI constants
    ├── baseStrategy.js  # Abstract base class with shared utilities
    ├── marcusStrategy.js    # Balanced: lowest-value first, saves bombs/2s
    ├── eddieStrategy.js     # Aggressive: always plays, prefers multi-card
    └── grandmaLiuStrategy.js # Conservative: passes often, plays singles
```

**Modified Files:**
- `src/server/app.js` - Socket events, processAiTurn integration
- `src/server/server-util.js` - Add isAiSeat(), getAiPersona() helpers
- `src/util.js` - Client-side isAiSeat() and AI constants
- `src/SeatingStageBoard.js` - Add/remove AI buttons

---

## Data Structures

### AI Identifier Convention
```javascript
// Format: '--{persona}' in the seated array
room.seated = [socketId, '--marcus', null, '--eddie']

// Detection
isAiSeat(seatId)     // seatId.startsWith('--')
getAiPersona(seatId) // seatId.slice(2) -> 'marcus'
```

### Play Object (from Hand Analyzer)
```javascript
{
  cards: ['3c', '3d'],        // Card IDs to play
  detection: {                 // From getDetectedCards()
    name: "Pair of 3's",
    play: 'One Pair',
    rank: 2
  },
  score: 15                    // Lower = cheaper play
}
```

---

## Core Components

### 1. Hand Analyzer (`handAnalyzer.js`)

**Purpose:** Find all valid plays from an AI's hand that beat the current board.

**Key Function:**
```javascript
export function analyzeHand(hand, room, seatIndex) {
  // Returns: { validPlays: [...], isFreePlay, mustIncludeLowest, ... }
}
```

**Algorithm:**
1. Get last play from board (or detect free play)
2. Generate candidate plays by type (singles, pairs, straights, etc.)
3. Filter to plays that beat the board via `getDetectedCards()` + rank comparison
4. Handle initial play constraint (must include `room.lowest` card)
5. Score each play and return sorted by cost (lowest first)

**Generators:**
- `generateSingles(hand)` - All individual cards
- `generatePairs(hand)` - Group by face, generate 2-combinations
- `generateTriples(hand)` - Group by face, 3+ cards per face
- `generateQuads(hand)` - Four of a kind bombs
- `generateStraights(hand, length)` - Consecutive sequences (cartesian product)
- `generateConsecutivePairs(hand, numPairs)` - 3+ consecutive pair bombs
- `generateFlushes(hand)` - 5+ same suit
- `generateFullHouses(hand)` - Triple + pair combinations

### 2. Card Evaluator (`cardEvaluator.js`)

**Purpose:** Score plays so strategies can choose between options.

```javascript
// Card values: 3=1, 4=2, ... A=12, 2=20 (premium)
// Suit bonus: clubs=0, diamonds=0.25, hearts=0.5, spades=0.75

export function scoreCard(cardId)                    // 1-21 range
export function evaluatePlay(cards, detection, hand) // Cost to play
```

**Cost Multipliers:**
- Singles: 1.0x
- Pairs: 1.2x
- Three of a Kind: 1.5x
- Bombs: 3.0x (valuable, high cost to use)

### 3. Strategy System (`strategies/`)

**Base Class Methods:**
```javascript
class BaseStrategy {
  choosePlay(analysis, room, seatIndex)  // Return play or null (pass)
  shouldPass(analysis, room)              // Voluntary pass check
  filterPlays(plays)                      // Strategy-specific filtering
  getOpponentCardCounts(room, seatIndex)  // Utility
  isAnyOpponentLow(room, seatIndex, threshold)
}
```

**Persona Behaviors:**

| Persona | Pass Rate | Delay | Strategy |
|---------|-----------|-------|----------|
| Marcus | Low | 1.5-3s | Plays lowest-cost. Saves bombs/2s unless opponent low on cards |
| Eddie | Never | 0.5-1.5s | Prefers multi-card plays. Never voluntarily passes |
| Grandma Liu | High | 2-4s | Prefers singles. Passes to save high cards. Uses bombs only when necessary |

### 4. Main Controller (`index.js`)

```javascript
export function processAiTurn(room, sendToEveryone, io) {
  // Check if current turn is AI
  // Add persona-specific delay via setTimeout
  // Call executeAiTurn() after delay
}

function executeAiTurn(room, seatIndex, sendToEveryone, io) {
  // 1. Analyze hand with handAnalyzer
  // 2. Get strategy for persona
  // 3. Let strategy choose play (or pass)
  // 4. Execute: update board, cards, last[], etc.
  // 5. Check win condition
  // 6. Advance turn, broadcast
  // 7. Recursively call processAiTurn() for next player
}
```

---

## Server Integration (app.js)

### New Socket Events

**`addAi`** - Add AI to empty seat during seating
```javascript
socket.on('addAi', ({ seatIndex, persona }) => {
  // Validate: seat empty, stage=seating, valid persona
  // Set: seated[seatIndex] = '--{persona}'
  // Init: aliases, colors, stats for AI
  // Broadcast via sendToEveryone
});
```

**`removeAi`** - Remove AI from seat during seating
```javascript
socket.on('removeAi', ({ seatIndex }) => {
  // Validate: seat has AI, stage=seating
  // Clear: seated, aliases, colors, stats
  // Broadcast
});
```

### Integration Points (3 locations)

1. **After `setGameStatus` → 'game'** (~line 221):
   ```javascript
   if (updatedStatus === 'game') {
     processAiTurn(roomData[roomName], sendToEveryone, io);
   }
   ```

2. **After `submitHand` advances turn** (~line 337):
   ```javascript
   roomData[roomName].turnIndex = findNextPlayersTurn(...);
   processAiTurn(roomData[roomName], sendToEveryone, io);
   ```

3. **After `passTurn` advances turn** (~line 355):
   ```javascript
   roomData[roomName].turnIndex = findNextPlayersTurn(...);
   processAiTurn(roomData[roomName], sendToEveryone, io);
   ```

### Modify `sendToEveryone()`

Skip AI entries when broadcasting (they have no socket):
```javascript
for (let player of data.players) {
  if (isAiSeat(player)) continue;  // ADD THIS
  // ... existing broadcast logic
}
```

---

## Client Integration

### util.js Additions
```javascript
export function isAiSeat(seatId) {
  return typeof seatId === 'string' && seatId.startsWith('--');
}

export const AI_PERSONAS = ['marcus', 'eddie', 'grandmaliu'];
export const AI_DISPLAY_NAMES = {
  marcus: 'Marcus (Balanced)',
  eddie: 'Eddie (Aggressive)',
  grandmaliu: 'Grandma Liu (Conservative)'
};
```

### SeatingStageBoard.js Changes

For empty seats, add AI dropdown alongside "Sit" button:
```jsx
<Dropdown button floating labeled icon='robot' text='Add AI'>
  <Dropdown.Menu>
    {AI_PERSONAS.map(persona => (
      <Dropdown.Item
        text={AI_DISPLAY_NAMES[persona]}
        onClick={() => sendMessage('addAi', { seatIndex, persona })}
      />
    ))}
  </Dropdown.Menu>
</Dropdown>
```

For AI-occupied seats, show robot icon with remove option:
```jsx
{isAiSeat(gameData.seated[seatIndex]) && (
  <Button onClick={() => sendMessage('removeAi', { seatIndex })}>
    <Icon name="robot" color="blue" />
  </Button>
)}
```

---

## Implementation Phases

### Phase 1: Core AI Infrastructure
1. Create `src/server/ai/` directory
2. Implement `cardEvaluator.js`
3. Implement `handAnalyzer.js` with all generators
4. Add `isAiSeat()`, `getAiPersona()` to `server-util.js`

### Phase 2: Strategy System
5. Create `baseStrategy.js`
6. Implement `marcusStrategy.js` (balanced)
7. Implement `eddieStrategy.js` (aggressive)
8. Implement `grandmaLiuStrategy.js` (conservative)
9. Create strategy factory in `strategies/index.js`

### Phase 3: Server Integration
10. Create `ai/index.js` with `processAiTurn()`
11. Add `addAi`/`removeAi` socket handlers to `app.js`
12. Integrate `processAiTurn()` at 3 turn transition points
13. Update `sendToEveryone()` to skip AI entries

### Phase 4: Client UI
14. Add AI helpers to `src/util.js`
15. Update `SeatingStageBoard.js` with AI buttons
16. Optional: Add robot icon indicator in `GameStageBoard.js`

---

## Verification Plan

1. **Dev servers:** Run `npm run dev` and `npm run server-dev`
2. **Seating UI:** Verify AI dropdown appears on empty seats
3. **Add/Remove:** Add AI, verify robot icon; remove, verify seat clears
4. **Game start:** Start game with 1 human + 1-3 AIs
5. **Turn flow:** Verify AI plays automatically after delay
6. **Strategy variety:** Test each persona shows distinct behavior
7. **Win condition:** Verify AI can win and game ends correctly
8. **All-AI edge case:** Test game with only AIs + spectating human
9. **Reconnect:** Verify human can rejoin without affecting AI seats

---

## Critical Files

| File | Action |
|------|--------|
| `src/server/ai/index.js` | CREATE - Main controller |
| `src/server/ai/handAnalyzer.js` | CREATE - Play generation |
| `src/server/ai/cardEvaluator.js` | CREATE - Scoring |
| `src/server/ai/strategies/*.js` | CREATE - 4 files (base + 3 personas) |
| `src/server/app.js` | MODIFY - Socket events, integration points |
| `src/server/server-util.js` | MODIFY - Add AI helpers |
| `src/util.js` | MODIFY - Client AI detection |
| `src/SeatingStageBoard.js` | MODIFY - AI add/remove UI |
