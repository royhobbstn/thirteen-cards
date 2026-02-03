# Scalability Planning Document

## Executive Summary

This document outlines the architectural changes required to scale the Thirteen Cards application from a single-instance prototype to a production-ready system capable of handling large volumes of concurrent players.

**Current State:** The application is designed for small-scale use (~1 server, <1,000 concurrent users). All game state is stored in-memory with no persistence, no authentication, no rate limiting, and no multi-instance support.

**Target State:** A horizontally scalable system with proper state management, security controls, abuse prevention, and data persistence.

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [Data Structure Analysis](#2-data-structure-analysis)
3. [Multi-Instance Deployment](#3-multi-instance-deployment)
4. [Data Persistence](#4-data-persistence)
5. [Security Vulnerabilities](#5-security-vulnerabilities)
6. [Abuse Prevention](#6-abuse-prevention)
7. [Performance Bottlenecks](#7-performance-bottlenecks)
8. [Implementation Roadmap](#8-implementation-roadmap)

---

## 1. Critical Issues

### 1.1 In-Memory Only Storage

**Location:** `src/server/app.js:58`

```javascript
const roomData = {};  // All game state stored here
```

**Problems:**
- Server restart loses all data (games, stats, sessions)
- No disaster recovery capability
- Memory unbounded - each room adds 10-80KB
- Cannot scale beyond single process

**Impact:** CRITICAL - Data loss on any server restart, crash, or deployment

---

### 1.2 Single-Instance Architecture

**Current Socket.io setup:** `src/server/app.js:55-56`

```javascript
const io = new Server(server);  // No adapter configured
```

**Problems:**
- Load balancer would route players to different instances
- Room state not shared between instances
- Reconnection fails if routed to different server
- AI timeouts fire on wrong instance

---

### 1.3 No Authentication

**Current identity model:**
- Socket ID stored in localStorage (`src/Room.js:32`)
- Username/color passed as query parameters
- No verification of identity claims
- Anyone can claim any username

**Attack vector:** Malicious user can impersonate others by manipulating localStorage

---

## 2. Data Structure Analysis

### 2.1 Current Room State Model

```javascript
{
  stage: 'seating' | 'game' | 'done',
  gameId: string,
  lastModified: timestamp,

  seated: [socketId|'--persona'|null],  // 4 seats
  players: [socketId, ...],
  aliases: { socketId: name },
  colors: { socketId: hex },

  cards: [[], [], [], []],
  board: [],
  lowest: string,
  initial: boolean,

  turnIndex: number,
  submitted: [],
  last: [detection|'pass'|null, ...],

  rank: [place|null, ...],
  startingPlayers: number,

  stats: { socketId: {...} }
}
```

### 2.2 Data Structure Issues

| Issue | Location | Problem |
|-------|----------|---------|
| Socket ID as primary key | Throughout | Ephemeral, changes on reconnect |
| Stats mixed with room | `room.stats` | Should be separate persistent entity |
| No room ID | Room key is name | URL-based, no unique identifier |
| Unbounded growth | `aliases`, `colors`, `stats` | Never pruned of old players |
| Nested objects | Full state | Deep copy required for each broadcast |

### 2.3 Recommended Data Model Refactoring

**Separate into distinct entities:**

```javascript
// User entity (persistent)
{
  id: uuid,
  username: string,
  colorChoice: string,
  createdAt: timestamp,
  lastSeen: timestamp
}

// UserStats entity (persistent)
{
  userId: uuid,
  points: number,
  games: number,
  first: number,
  second: number,
  third: number,
  fourth: number,
  bombs: number
}

// Room entity (ephemeral but recoverable)
{
  id: uuid,
  name: string,
  stage: string,
  createdAt: timestamp,
  lastModified: timestamp
}

// GameState entity (ephemeral)
{
  id: uuid,
  roomId: uuid,
  seats: [userId|aiPersona|null],
  hands: [[], [], [], []],
  board: [],
  turnIndex: number,
  lastPlays: [],
  rankings: [],
  startedAt: timestamp
}

// Session entity (for reconnection)
{
  sessionToken: string,
  userId: uuid,
  socketId: string,
  roomId: uuid,
  expiresAt: timestamp
}
```

---

## 3. Multi-Instance Deployment

### 3.1 Current Limitations

The application cannot run on multiple instances because:

1. **No shared state store** - Each instance has its own `roomData` object
2. **No Socket.io adapter** - WebSocket connections are instance-local
3. **No session affinity** - Reconnection may hit different instance
4. **No message bus** - Broadcasts only reach local sockets

### 3.2 Required Architecture Changes

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                          │
│                   (Sticky Sessions)                         │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Instance 1  │     │   Instance 2  │     │   Instance 3  │
│  Express +    │     │  Express +    │     │  Express +    │
│  Socket.io    │     │  Socket.io    │     │  Socket.io    │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │      Redis      │
                    │  - Pub/Sub      │
                    │  - Session      │
                    │  - Room State   │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │  - Users        │
                    │  - Stats        │
                    │  - Game History │
                    └─────────────────┘
```

### 3.3 Implementation Requirements

**A. Socket.io Redis Adapter**

```javascript
// Required package: @socket.io/redis-adapter
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

**B. Redis for Room State**

```javascript
// Store room state in Redis instead of in-memory
async function getRoomData(roomName) {
  const data = await redis.get(`room:${roomName}`);
  return data ? JSON.parse(data) : null;
}

async function setRoomData(roomName, data) {
  await redis.set(`room:${roomName}`, JSON.stringify(data), 'EX', 7200);
}
```

**C. Sticky Sessions for Load Balancer**

```nginx
# nginx configuration
upstream socket_nodes {
    ip_hash;  # Or use cookie-based affinity
    server instance1:4000;
    server instance2:4000;
    server instance3:4000;
}
```

---

## 4. Data Persistence

### 4.1 Current State

- **No database** - All data in-memory
- **Stats lost on restart** - Player statistics not persisted
- **No game history** - Cannot review past games
- **Room cleanup** - 1-hour timeout, then deleted forever

### 4.2 Persistence Strategy

**Layer 1: Redis (Hot Data)**
- Active room state
- Active game state
- Session tokens
- Rate limiting counters
- TTL: 2-24 hours

**Layer 2: PostgreSQL (Cold Data)**
- User accounts
- User statistics (aggregate)
- Completed game records
- Audit logs
- TTL: Permanent

### 4.3 Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL,
    color_choice VARCHAR(7) DEFAULT '#000000',
    password_hash VARCHAR(255),  -- Optional for guest accounts
    is_guest BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_seen_at TIMESTAMP DEFAULT NOW()
);

-- User statistics
CREATE TABLE user_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    points INTEGER DEFAULT 0,
    games INTEGER DEFAULT 0,
    first_place INTEGER DEFAULT 0,
    second_place INTEGER DEFAULT 0,
    third_place INTEGER DEFAULT 0,
    fourth_place INTEGER DEFAULT 0,
    bombs_played INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Game history
CREATE TABLE games (
    id UUID PRIMARY KEY,
    room_name VARCHAR(100) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    player_count INTEGER NOT NULL,
    winner_id UUID REFERENCES users(id)
);

-- Game participants
CREATE TABLE game_participants (
    game_id UUID REFERENCES games(id),
    user_id UUID REFERENCES users(id),
    seat_index INTEGER NOT NULL,
    finish_position INTEGER,
    points_earned INTEGER,
    PRIMARY KEY (game_id, user_id)
);

-- Sessions for reconnection
CREATE TABLE sessions (
    token VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    room_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);
```

### 4.4 Migration Strategy

1. Add PostgreSQL for users/stats (new players only initially)
2. Add Redis for room state caching
3. Implement dual-write: memory + Redis
4. Implement read-through: Redis → memory
5. Remove in-memory storage once stable

---

## 5. Security Vulnerabilities

### 5.1 Input Validation Gaps

**Current validation:** `src/util.js:79-97`

| Field | Current Check | Missing |
|-------|--------------|---------|
| `userName` | Length ≤50, type check | XSS sanitization, profanity filter |
| `colorChoice` | Hex regex | None significant |
| `lastKnownSocket` | Length ≤100, type check | Format validation |
| `roomName` | None | Length limit, character whitelist |
| `seatIndex` | None | Range validation (0-3) |
| `selectedCards` | Array type | Card ID format, ownership |

### 5.2 Missing Security Controls

**A. No CORS Configuration**

```javascript
// Current: Default Socket.io CORS (permissive)
const io = new Server(server);

// Required: Explicit CORS policy
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'https://yourdomain.com',
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

**B. No Request Size Limits**

```javascript
// Add to Express middleware
app.use(express.json({ limit: '10kb' }));

// Add to Socket.io
const io = new Server(server, {
  maxHttpBufferSize: 1e5  // 100KB max message size
});
```

**C. No Content Security Policy**

```javascript
// Add helmet middleware
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "wss://yourdomain.com"]
    }
  }
}));
```

### 5.3 Authentication Implementation

**Recommended: JWT-based sessions**

```javascript
// Login/register endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await findOrCreateUser(username, password);
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username } });
});

// Socket.io authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});
```

### 5.4 Card Data Security

**Current obscuration:** `src/server/app.js:631-650`

```javascript
// Current: Full deep copy per player
const copy = JSON.parse(JSON.stringify(data));
// Then hide other players' cards
```

**Improved approach:**

```javascript
// Build player-specific view without full deep copy
function buildPlayerView(room, playerId) {
  return {
    ...room,
    cards: room.cards.map((hand, idx) =>
      room.seated[idx] === playerId ? hand : hand.map(() => 'hidden')
    ),
    // Don't send internal fields
    lastModified: undefined
  };
}
```

---

## 6. Abuse Prevention

### 6.1 Rate Limiting

**No rate limiting currently exists.** Implement at multiple levels:

**A. Express Rate Limiting**

```javascript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // 100 requests per window
  message: 'Too many requests'
});
app.use('/api/', apiLimiter);
```

**B. Socket.io Event Rate Limiting**

```javascript
// Rate limiter per socket
const socketRateLimits = new Map();

function checkRateLimit(socketId, event, limit, windowMs) {
  const key = `${socketId}:${event}`;
  const now = Date.now();
  const record = socketRateLimits.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count++;
  socketRateLimits.set(key, record);

  return record.count <= limit;
}

// Apply to events
socket.on('submitHand', (data) => {
  if (!checkRateLimit(socket.id, 'submitHand', 10, 10000)) {  // 10 per 10 seconds
    return socket.emit('playError', { message: 'Too many requests' });
  }
  // ... handle event
});
```

**C. Rate Limits by Event Type**

| Event | Limit | Window | Rationale |
|-------|-------|--------|-----------|
| `submitHand` | 10 | 10s | Prevents rapid-fire plays |
| `passTurn` | 10 | 10s | Same as submitHand |
| `newChatMessage` | 5 | 10s | Prevents chat spam |
| `chooseSeat` | 5 | 30s | Prevents seat-hopping |
| `updateSettings` | 3 | 60s | Prevents name-change spam |
| `addAi` | 4 | 30s | Prevents AI spam |

### 6.2 Connection Limits

```javascript
// Track connections per IP
const connectionsByIP = new Map();
const MAX_CONNECTIONS_PER_IP = 10;

io.on('connection', (socket) => {
  const ip = socket.handshake.address;
  const count = connectionsByIP.get(ip) || 0;

  if (count >= MAX_CONNECTIONS_PER_IP) {
    socket.emit('error', 'Too many connections from your IP');
    socket.disconnect(true);
    return;
  }

  connectionsByIP.set(ip, count + 1);

  socket.on('disconnect', () => {
    const current = connectionsByIP.get(ip) || 1;
    connectionsByIP.set(ip, current - 1);
  });
});
```

### 6.3 Room Creation Limits

```javascript
// Limit rooms per IP
const roomsByIP = new Map();
const MAX_ROOMS_PER_IP = 5;

// In announceConnection handler
if (!roomData[roomName]) {
  const ip = socket.handshake.address;
  const roomCount = roomsByIP.get(ip) || 0;

  if (roomCount >= MAX_ROOMS_PER_IP) {
    socket.emit('error', 'Room creation limit reached');
    return;
  }

  roomsByIP.set(ip, roomCount + 1);
  // Create room...
}
```

### 6.4 Anti-Cheat Measures

**A. Server-Side Turn Timing**

```javascript
// Track last turn time
room.lastTurnTime = Date.now();

// Minimum time between plays
const MIN_TURN_DELAY = 500; // 500ms minimum

socket.on('submitHand', (data) => {
  const elapsed = Date.now() - room.lastTurnTime;
  if (elapsed < MIN_TURN_DELAY) {
    return socket.emit('playError', { message: 'Please wait before playing' });
  }
  // ...
});
```

**B. Action Logging**

```javascript
// Log all game actions for review
async function logGameAction(gameId, userId, action, data) {
  await db.query(`
    INSERT INTO game_actions (game_id, user_id, action, data, created_at)
    VALUES ($1, $2, $3, $4, NOW())
  `, [gameId, userId, action, JSON.stringify(data)]);
}
```

### 6.5 Content Moderation

```javascript
// Username/chat filtering
import Filter from 'bad-words';
const filter = new Filter();

function sanitizeUsername(name) {
  if (filter.isProfane(name)) {
    return 'Player' + Math.floor(Math.random() * 10000);
  }
  return name.substring(0, 50).replace(/[<>]/g, '');  // Also strip HTML
}
```

---

## 7. Performance Bottlenecks

### 7.1 AI Hand Analysis Complexity

**Location:** `src/server/ai/handAnalyzer.js`

**Problem:** Generates ALL possible plays via combinations, leading to exponential complexity.

```javascript
// Current: O(2^n) combinations for n cards
function generateAllPlays(hand) {
  // Generates singles, pairs, straights (3-13 cards), flushes, etc.
  // 13-card hand can generate 10,000+ candidate plays
}
```

**Solution: Lazy Generation with Early Termination**

```javascript
// Generate plays incrementally, stop when enough valid plays found
function* generatePlaysIterator(hand, boardPlay) {
  // Yield singles first (cheapest)
  for (const card of hand) {
    yield { type: 'single', cards: [card] };
  }

  // Yield pairs
  for (const pair of generatePairs(hand)) {
    yield { type: 'pair', cards: pair };
  }

  // ... continue with other types
}

function findValidPlays(hand, boardPlay, maxPlays = 20) {
  const valid = [];
  for (const play of generatePlaysIterator(hand, boardPlay)) {
    if (beatsBoard(play, boardPlay)) {
      valid.push(play);
      if (valid.length >= maxPlays) break;  // Early termination
    }
  }
  return valid;
}
```

### 7.2 Deep Copy on Every Broadcast

**Location:** `src/server/app.js:631-650`

```javascript
// Current: Full JSON serialization per player
const copy = JSON.parse(JSON.stringify(data));
```

**Solution: Structural Sharing**

```javascript
// Only copy what changes per player (the cards array)
function buildPlayerView(room, playerSeatIndex) {
  const obscuredCards = room.cards.map((hand, idx) =>
    idx === playerSeatIndex ? hand : hand.length  // Just send count for others
  );

  return {
    ...room,  // Shallow copy (safe for immutable fields)
    cards: obscuredCards
  };
}
```

### 7.3 Cleanup Scan Performance

**Location:** `src/server/app.js:653-664`

```javascript
// Current: Full scan every 5 minutes
for (let roomKey of Object.keys(roomData)) {
  // Check each room's lastModified
}
```

**Solution: Priority Queue for Expiration**

```javascript
import Heap from 'heap';

const expirationHeap = new Heap((a, b) => a.expiresAt - b.expiresAt);

function scheduleRoomExpiration(roomName, ttlMs) {
  expirationHeap.push({
    roomName,
    expiresAt: Date.now() + ttlMs
  });
}

// Cleanup only checks top of heap
function cleanupExpiredRooms() {
  const now = Date.now();
  while (!expirationHeap.empty() && expirationHeap.peek().expiresAt <= now) {
    const { roomName } = expirationHeap.pop();
    if (roomData[roomName]?.lastModified < now - TTL) {
      delete roomData[roomName];
    }
  }
}
```

### 7.4 Memory Leak: Unbounded Object Growth

**Affected fields:** `aliases`, `colors`, `stats`

```javascript
// Current: Never cleaned
room.aliases[socketId] = username;  // Accumulates forever
```

**Solution: Prune on Disconnect**

```javascript
socket.on('disconnect', () => {
  const room = roomData[roomName];
  if (!room) return;

  // Remove from active players
  room.players = room.players.filter(id => id !== socket.id);

  // If not seated, clean up aliases/colors
  if (!room.seated.includes(socket.id)) {
    delete room.aliases[socket.id];
    delete room.colors[socket.id];
  }

  // Persist stats before removing from memory
  if (room.stats[socket.id]) {
    await persistUserStats(socket.userId, room.stats[socket.id]);
    delete room.stats[socket.id];
  }
});
```

---

## 8. Implementation Roadmap

### Phase 1: Security Hardening (Week 1-2)

**Priority: CRITICAL**

| Task | File(s) | Effort |
|------|---------|--------|
| Add input sanitization | `server/app.js`, `util.js` | 2h |
| Configure Socket.io CORS | `server/app.js` | 1h |
| Add rate limiting middleware | `server/app.js` | 4h |
| Implement connection limits | `server/app.js` | 2h |
| Add request size limits | `server/app.js` | 1h |
| Add helmet security headers | `server/app.js` | 1h |

### Phase 2: Data Persistence (Week 2-4)

**Priority: HIGH**

| Task | Effort |
|------|--------|
| Set up PostgreSQL schema | 4h |
| Create User model and repository | 4h |
| Create Stats model and repository | 4h |
| Implement user registration/login | 8h |
| Add JWT authentication to Socket.io | 4h |
| Persist stats on game completion | 4h |
| Add session tokens for reconnection | 4h |

### Phase 3: Redis Integration (Week 4-5)

**Priority: HIGH**

| Task | Effort |
|------|--------|
| Set up Redis connection | 2h |
| Implement Socket.io Redis adapter | 4h |
| Move room state to Redis | 8h |
| Implement session store in Redis | 4h |
| Add rate limiting with Redis | 4h |

### Phase 4: Performance Optimization (Week 5-6)

**Priority: MEDIUM**

| Task | Effort |
|------|--------|
| Optimize hand analyzer with early termination | 8h |
| Replace deep copy with structural sharing | 4h |
| Implement priority queue for cleanup | 4h |
| Add memory leak fixes | 4h |
| Profile and optimize hot paths | 8h |

### Phase 5: Multi-Instance Deployment (Week 6-8)

**Priority: MEDIUM**

| Task | Effort |
|------|--------|
| Configure load balancer with sticky sessions | 4h |
| Test multi-instance Socket.io | 8h |
| Implement graceful shutdown | 4h |
| Add health check endpoints | 2h |
| Implement rolling deployment strategy | 8h |

### Phase 6: Monitoring & Observability (Week 8-9)

**Priority: MEDIUM**

| Task | Effort |
|------|--------|
| Add structured logging (Winston/Pino) | 4h |
| Implement APM (DataDog/New Relic) | 4h |
| Add metrics endpoint (Prometheus) | 4h |
| Create alerting rules | 4h |
| Build monitoring dashboard | 8h |

---

## Appendix: Technology Recommendations

### Recommended Stack Additions

| Component | Recommendation | Rationale |
|-----------|---------------|-----------|
| Database | PostgreSQL 15+ | Robust, JSON support, free tier available |
| Cache/Session | Redis 7+ | Socket.io adapter, pub/sub, rate limiting |
| Authentication | JWT + bcrypt | Stateless, scalable |
| Rate Limiting | rate-limiter-flexible | Redis-backed, distributed |
| Logging | Pino | Fast, structured JSON logging |
| Monitoring | Prometheus + Grafana | Open source, industry standard |
| Load Balancer | nginx or HAProxy | Sticky sessions, WebSocket support |
| Container | Docker + Kubernetes | Horizontal scaling, health checks |

### Estimated Infrastructure Requirements

| Scale | Instances | Redis | PostgreSQL | Est. Cost/mo |
|-------|-----------|-------|------------|--------------|
| 1K concurrent | 1 | 1GB | 1 vCPU | $50 |
| 10K concurrent | 3 | 4GB | 2 vCPU | $200 |
| 100K concurrent | 10 | 16GB cluster | 4 vCPU HA | $1,000 |

---

## Summary

The application requires significant architectural changes to scale. The most critical immediate needs are:

1. **Security hardening** - Add input validation, rate limiting, CORS
2. **Data persistence** - PostgreSQL for users/stats, Redis for sessions
3. **Multi-instance support** - Socket.io Redis adapter, shared state

Without these changes, the application is limited to a single server handling approximately 1,000 concurrent users, with all data lost on restart.
