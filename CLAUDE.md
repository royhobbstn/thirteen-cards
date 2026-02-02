# CLAUDE.md

## Project Overview

Thirteen Cards is a real-time multiplayer web implementation of the classic card game "Thirteen" (also known as Tiến Lên). 2-4 players compete to be the first to get rid of all their cards by playing valid card combinations that beat the previous play.

## Tech Stack

- **Frontend:** React 17, React Router, Semantic UI React, Socket.io-client
- **Backend:** Express, Socket.io, Node.js (ES modules)
- **Build:** Create React App

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
```

Run both `npm run dev` and `npm run server-dev` in separate terminals for local development.

## Project Structure

```
src/
├── server/
│   ├── app.js              # Express + Socket.io server
│   └── server-util.js      # Server-side game logic
├── cardUtils/
│   ├── cards.js            # Card rank definitions
│   ├── detectedCards.js    # Pattern detection orchestrator
│   └── detect_*.js         # Pattern detectors (1-13 cards)
├── useGame.js              # Custom hook for game state
├── useChat.js              # Custom hook for chat
├── Game.js                 # Main game container
├── Board.js                # Table display
├── CardSpace.js            # Player's hand UI
└── util.js                 # Client-side utilities
```

## Key Patterns

**Socket.io Events:**
- Client → Server: `announcConnection`, `chooseSeat`, `setGameStatus`, `submitHand`, `passTurn`, `forfeit`, `updateSettings`, `newChatMessage`
- Server → Client: `gameData` (full room state), `newChatMessage`

**Card Format:** `{rank}{suit}` (e.g., `3c`, `Ah`, `2s`)
- Ranks: 3 (lowest) → 2 (highest)
- Suits: c (clubs), d (diamonds), h (hearts), s (spades)

**Room State Model:**
```javascript
{
  stage: 'seating' | 'game' | 'done',
  seated: [socketId, ...],      // 4 seats
  cards: [[...], ...],          // hands per seat
  board: [...],                 // current cards on table
  turnIndex: number,            // current turn
  stats: { socketId: {...} },   // player statistics
  aliases: { socketId: name }   // player names
}
```

**Card Detection:** Each `detect_N.js` file handles patterns for N cards (singles, pairs, straights, flushes, bombs, etc.) and returns `{ name, play, rank }`.

## Code Style

- Prettier: 100 char width, single quotes, trailing commas
- ES modules (`import`/`export`)
- Functional React components with hooks

## Deployment

Heroku-ready via `Procfile`. Build creates optimized bundle in `/build`, served by Express in production.
