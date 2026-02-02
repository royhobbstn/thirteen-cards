# CLAUDE.md

## Project Overview

Thirteen Cards is a real-time multiplayer web implementation of the classic card game "Thirteen" (also known as Tiến Lên). 2-4 players compete to be the first to get rid of all their cards by playing valid card combinations that beat the previous play. Supports both human players and AI opponents.

## Tech Stack

- **Frontend:** React 17, React Router 5, Semantic UI React, Socket.io-client
- **Backend:** Express, Socket.io, Node.js (ES modules)
- **Build:** Create React App
- **UI Utilities:** react-draggable, react-sortablejs, react-color

## Development Commands

```bash
# Start React dev server (port 3000, proxies to 4000)
npm run dev

# Start Express server with nodemon (port 4000)
npm run server-dev

# Production build
npm run build

# Production server (serves built React app)
npm start

# Count lines of code
npm run loc
```

Run both `npm run dev` and `npm run server-dev` in separate terminals for local development.

## Project Structure

```
src/
├── server/
│   ├── app.js                # Express + Socket.io server
│   ├── server-util.js        # Server-side game logic utilities
│   └── ai/
│       ├── index.js          # AI turn processor and orchestrator
│       ├── handAnalyzer.js   # Generates valid plays for AI
│       ├── cardEvaluator.js  # Scores plays based on strategy
│       └── strategies/
│           ├── index.js          # Strategy registry
│           ├── baseStrategy.js   # Base strategy class
│           ├── marcusStrategy.js # Balanced player
│           ├── eddieStrategy.js  # Aggressive player
│           └── grandmaLiuStrategy.js # Conservative player
├── cardUtils/
│   ├── cards.js              # Card rank/face definitions
│   ├── detectedCards.js      # Pattern detection orchestrator
│   └── detect_1.js - detect_13.js  # Pattern detectors by card count
├── Game.js                   # Main game container
├── Board.js                  # Table display with card animations
├── CardSpace.js              # Player's hand UI with drag/drop
├── SeatingStageBoard.js      # Seat selection UI (seating phase)
├── GameStageBoard.js         # Seat indicators (game phase)
├── GameOverModal.js          # Results and "Play Again"
├── Room.js                   # Room container with Socket.io
├── MainMenu.js               # Top menu bar
├── TabContainer.js           # Chat/Stats/Rules tabs
├── Chat.js                   # Real-time chat
├── Stats.js                  # Player statistics leaderboard
├── Settings.js               # Username and color picker
├── StatusBar.js              # Current turn/play status
├── Rules.js                  # Game rules documentation
├── useGame.js                # Custom hook for game state
├── useChat.js                # Custom hook for chat
└── util.js                   # Client-side utilities
```

## Key Patterns

### Socket.io Events

**Client → Server:**
- `announceConnection` - Player joins/reconnects
- `chooseSeat` - Sit down or stand up
- `setGameStatus` - Change game stage
- `submitHand` - Play cards
- `passTurn` - Pass turn
- `forfeit` - Give up
- `updateSettings` - Change username/color
- `newChatMessage` - Send chat message
- `addAi` - Add AI player to seat
- `removeAi` - Remove AI player

**Server → Client:**
- `gameData` - Full room state broadcast
- `newChatMessage` - Chat message broadcast
- `playError` - Play validation error

### Card Format

Format: `{rank}{suit}` (e.g., `3c`, `Ah`, `2s`)
- **Ranks:** 3 (lowest) → 4 → 5 → ... → K → A → 2 (highest)
- **Suits:** c (clubs) < d (diamonds) < h (hearts) < s (spades)

### Valid Play Types

| Cards | Type | Description |
|-------|------|-------------|
| 1 | Single | Any single card |
| 2 | Pair | Two cards same rank |
| 3 | Three of a Kind | Three cards same rank |
| 4 | Four of a Kind (Bomb) | Four cards same rank - beats anything |
| 5 | Full House | Three of a kind + pair |
| 5 | Flush | Five cards same suit |
| 5+ | Straight | 3-13 consecutive ranks |
| 5+ | Straight Flush | Consecutive ranks, same suit |

### Room State Model

```javascript
{
  // Status
  stage: 'seating' | 'game' | 'done',
  gameId: string,                // UUID for current game

  // Players
  seated: [socketId, ...],       // 4 seats (null=empty, '--persona'=AI)
  players: [socketId, ...],      // Active player IDs
  aliases: { socketId: name },   // Display names
  colors: { socketId: hex },     // Chat colors

  // Cards
  cards: [[], [], [], []],       // Hands per seat
  board: [],                     // Current table cards
  lowest: string,                // Lowest card (must play first)
  initial: boolean,              // First hand played?

  // Turns
  turnIndex: number,             // Current turn seat
  submitted: [],                 // Cards being submitted
  last: [obj, null, ...],        // Last play per seat

  // Results
  rank: [null, ...],             // Finishing positions (1-4)
  startingPlayers: number,       // Players when game started

  // Statistics
  stats: { socketId: { points, playerGames, games, first, second, third, fourth, bombs } }
}
```

## AI System

Three AI personas with distinct play styles:

| Persona | Style | Behavior |
|---------|-------|----------|
| Marcus | Balanced | Average speed, balanced card selection |
| Eddie | Aggressive | Fast plays, uses high cards early |
| Grandma Liu | Conservative | Slow, saves high cards for later |

AI flow:
1. `processAiTurn()` triggers after turn transition
2. `analyzeHand()` generates all valid plays
3. `cardEvaluator` scores each play based on strategy
4. AI selects play and submits after random delay

## Game Mechanics

### Turn Flow
1. Player plays valid cards or passes
2. If all others pass, board clears for free play
3. First play must include lowest card in hand
4. Game ends when a player empties their hand

### Ranking & Stats
- Points per game: `startingPlayers - finishPosition + 1`
- Score calculation: `(points / playerGames) * 4`
- Tracks: placements (1st-4th), games played, bombs used

### Reconnection
- Socket ID stored in localStorage
- On reconnect, server replaces old socket ID with new one
- Stats and game position preserved

## Code Style

- Prettier: 100 char width, single quotes, trailing commas
- ES modules (`import`/`export`)
- Functional React components with hooks

## Deployment

Heroku-ready via `Procfile`. Build creates optimized bundle in `/build`, served by Express in production.
