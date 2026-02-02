# AI Players Feature Implementation Plan

## Overview

Add AI players to Thirteen Cards that can be placed in any seat during the seating phase. Each AI has a distinct persona with unique strategic behavior.

## Data Model

### AI Identification
Use prefix format in `seated` array: `ai:<persona>`
- Example: `'ai:aggressive'`, `'ai:conservative'`
- Easy detection: `seat.startsWith('ai:')`
- Persona encoded in ID, no extra data structures needed

### Helper Functions (add to `server-util.js`)
```javascript
export function isAiSeat(seatValue) {
  return typeof seatValue === 'string' && seatValue.startsWith('ai:');
}

export function getAiPersona(seatValue) {
  if (!isAiSeat(seatValue)) return null;
  return seatValue.split(':')[1] || 'balanced';
}
```

## New Socket Events

### `addAi` - Add AI to empty seat
- Parameters: `{ seatIndex, persona }`
- Only allowed during 'seating' stage
- Sets `seated[seatIndex] = 'ai:<persona>'`
- Initializes alias, color, and stats

### `removeAi` - Remove AI from seat
- Parameters: `{ seatIndex }`
- Only allowed during 'seating' stage
- Sets `seated[seatIndex] = null`

## AI Decision Architecture

### File Structure
```
src/server/ai/
  index.js              # Main controller, triggers AI turns
  handAnalyzer.js       # Finds all valid plays from a hand
  cardEvaluator.js      # Scores cards/combinations
  strategies/
    index.js            # Strategy registry
    baseStrategy.js     # Abstract base class
    balanced.js         # Marcus "The Calculator" Chen
    aggressive.js       # "Fast Eddie" Rodriguez
    conservative.js     # Grandma Liu
```

### Core AI Flow
1. After any turn change, call `processAiTurn(room, io, roomName)`
2. If current player is AI, get their strategy
3. Add "thinking" delay (1-4 seconds based on persona)
4. Strategy evaluates hand and board, returns `{action: 'play'|'pass', cards?}`
5. Execute the action, advance turn, recursively check next player

### Hand Analyzer
- Generate all card subsets (1-13 cards)
- Run each through `getDetectedCards()`
- Filter to valid plays that beat the board
- Return array of `{cards, detection}` options

### Strategy Selection
Each persona overrides `selectPlay(validPlays, hand, lastPlay, room)`:
- **Marcus (Balanced)**: Plays lowest-value cards first, occasional strategic passes
- **Eddie (Aggressive)**: Always plays if possible, prefers multi-card plays
- **Grandma Liu (Conservative)**: Saves high cards, passes frequently, plays singles when possible

## Server Integration Points

### `app.js` Modifications

1. **Import AI module** (near top):
   ```javascript
   import { processAiTurn } from './ai/index.js';
   import { isAiSeat } from './server-util.js';
   ```

2. **Add socket events** for `addAi` and `removeAi`

3. **After `setGameStatus` → 'game'** (line ~221):
   ```javascript
   processAiTurn(roomData[roomName], io, roomName, sendToEveryone);
   ```

4. **After `submitHand` advances turn** (line ~328):
   ```javascript
   processAiTurn(roomData[roomName], io, roomName, sendToEveryone);
   ```

5. **After `passTurn` advances turn** (line ~346):
   ```javascript
   processAiTurn(roomData[roomName], io, roomName, sendToEveryone);
   ```

6. **Update `sendToEveryone`**: Skip AI IDs when broadcasting (they have no socket)

## Client UI Changes

### `SeatingStageBoard.js`
- Empty seat: Show "Sit" button AND dropdown to "Add AI" with persona options
- AI seat: Show robot icon (blue), click to remove
- Human seat: Existing behavior unchanged

### `util.js`
- Add client-side `isAiSeat()` helper

### `Board.js` / `StatusBar.js`
- Show "(AI)" label next to AI player names
- Show "thinking..." instead of "playing..." when AI's turn

## AI Persona Details

### Marcus "The Calculator" Chen (Balanced)
**Backstory**: A retired accountant who spent 30 years optimizing spreadsheets. Now he applies that same methodical precision to cards. Never rushes, never wastes a good hand.

| Attribute | Value |
|-----------|-------|
| Thinking Delay | 1.5-3.5s |
| Pass Rate | 30% |
| Strategy | Plays lowest-value cards first, preserves bombs and 2s for crucial moments |

### "Fast Eddie" Rodriguez (Aggressive)
**Backstory**: Former street racer turned card shark. Eddie believes hesitation is defeat. He'd rather go down swinging with a bold play than win slowly. His motto: "Cards don't play themselves!"

| Attribute | Value |
|-----------|-------|
| Thinking Delay | 0.5-1.5s |
| Pass Rate | 5% |
| Strategy | Always plays if possible, prefers multi-card combos to clear hand fast |

### Grandma Liu (Conservative)
**Backstory**: 78 years old and has been playing Thirteen since childhood in Saigon. She's seen every trick in the book and knows patience wins wars. Will hold her 2s until the perfect moment to crush your hopes.

| Attribute | Value |
|-----------|-------|
| Thinking Delay | 2-4s |
| Pass Rate | 50% |
| Strategy | Hoards high cards, passes frequently, plays singles when possible |

## Implementation Order

### Phase 1: Core Infrastructure
1. Add AI helpers to `server-util.js`
2. Create `src/server/ai/` directory
3. Implement `handAnalyzer.js`
4. Implement `cardEvaluator.js`

### Phase 2: Strategies
5. Create `baseStrategy.js`
6. Implement 3 persona strategies (Marcus, Eddie, Grandma Liu)
7. Create strategy registry

### Phase 3: Server Integration
8. Create main `ai/index.js` controller
9. Add `addAi`/`removeAi` socket events
10. Integrate `processAiTurn()` into game flow
11. Update `sendToEveryone()` for AI handling

### Phase 4: Client UI
12. Update `SeatingStageBoard.js` with AI controls
13. Add `isAiSeat()` to `util.js`
14. Update status displays for AI

## Verification

1. Start dev servers: `npm run dev` and `npm run server-dev`
2. Open game room, verify AI dropdown appears on empty seats
3. Add AI to a seat, verify robot icon shows
4. Start game with 1 human + AI(s)
5. Verify AI plays automatically after delay
6. Test all personas have distinct behavior
7. Verify game completes normally with AI players
8. Test removing AI during seating phase

## Critical Files

- `src/server/app.js` - Socket events and turn integration
- `src/server/server-util.js` - AI helper functions
- `src/server/ai/index.js` - NEW: Main AI controller
- `src/server/ai/handAnalyzer.js` - NEW: Find valid plays
- `src/server/ai/strategies/*.js` - NEW: Persona implementations
- `src/SeatingStageBoard.js` - AI seat UI controls
- `src/util.js` - Client-side AI detection
