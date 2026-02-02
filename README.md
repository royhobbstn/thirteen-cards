# Thirteen Cards

A real-time multiplayer web implementation of **Thirteen** (Tiến Lên), the classic Vietnamese climbing card game. Play with 2-4 players online or challenge AI opponents with unique personalities.

## Features

- **Real-time Multiplayer** — Play with friends using Socket.io-powered live gameplay
- **AI Opponents** — Three distinct AI personalities with different play styles
- **Drag & Drop UI** — Intuitive card management with sorting and rearranging
- **Persistent Stats** — Track wins, placements, and bomb usage across sessions
- **Reconnection Support** — Drop and rejoin without losing your game state
- **Live Chat** — Built-in chat with customizable player colors
- **Mobile Friendly** — Responsive design works on all devices

## Game Rules

### Objective

Be the first player to get rid of all your cards.

### Card Rankings

**Ranks (low to high):** 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → J → Q → K → A → 2

**Suits (low to high):** Clubs (♣) → Diamonds (♦) → Hearts (♥) → Spades (♠)

### Valid Plays

| Cards | Type               | Description                                     |
| :---: | ------------------ | ----------------------------------------------- |
|   1   | Single             | Any single card                                 |
|   2   | Pair               | Two cards of the same rank                      |
|   3   | Triple             | Three cards of the same rank                    |
|   4   | **Four of a Kind** | Four cards of the same rank — _beats anything!_ |
|   5   | Straight           | 3+ consecutive ranks (e.g., 5-6-7)              |
|   5   | Flush              | Five cards of the same suit                     |
|   5   | Full House         | Three of a kind + a pair                        |
|  5+   | Straight Flush     | Consecutive ranks, all same suit                |

### Gameplay

1. Player with the lowest card (3♣) plays first
2. Play a valid combination that beats the current play, or pass
3. When all others pass, the last player to play starts a new round
4. First player to empty their hand wins!

## AI Opponents

Challenge three AI players, each with their own strategy:

| AI              | Personality   | Play Style                                        |
| --------------- | ------------- | ------------------------------------------------- |
| **Marcus**      | The Balanced  | Steady, calculated plays with average timing      |
| **Eddie**       | The Aggressor | Fast and furious, burns high cards early          |
| **Grandma Liu** | The Turtle    | Patient and conservative, saves the best for last |

## Tech Stack

| Layer    | Technologies                                   |
| -------- | ---------------------------------------------- |
| Frontend | React 17, React Router, Semantic UI React      |
| Backend  | Node.js, Express, Socket.io                    |
| UI/UX    | react-draggable, react-sortablejs, react-color |
| Build    | Create React App                               |

## Quick Start

### Prerequisites

- Node.js 14+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/thirteen-cards.git
cd thirteen-cards

# Install dependencies
npm install
```

### Development

Run both commands in separate terminals:

```bash
# Terminal 1: Start React dev server (port 3000)
npm run dev

# Terminal 2: Start Express server (port 4000)
npm run server-dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

### Production

```bash
# Build the React app
npm run build

# Start the production server
npm start
```

## Project Structure

```
src/
├── server/
│   ├── app.js              # Express + Socket.io server
│   ├── server-util.js      # Game logic utilities
│   └── ai/                 # AI player system
│       ├── index.js        # Turn processor
│       ├── handAnalyzer.js # Valid play generator
│       ├── cardEvaluator.js# Play scoring
│       └── strategies/     # AI personality modules
│
├── cardUtils/
│   ├── cards.js            # Card definitions
│   ├── detectedCards.js    # Pattern detection
│   └── detect_*.js         # Pattern detectors (1-13 cards)
│
├── Game.js                 # Main game container
├── Board.js                # Table display & animations
├── CardSpace.js            # Player hand UI
├── Room.js                 # Socket.io room management
└── ...
```

## Scoring System

- **Points per game:** `(number of players) - (finish position) + 1`
- **Leaderboard score:** `(total points / games played) × 4`

Stats tracked: 1st/2nd/3rd/4th place finishes, total games, bombs played.
