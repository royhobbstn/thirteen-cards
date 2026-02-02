# Card Selection UI Redesign

## Summary
Replace the double-click staging area flow with single-click card selection where selected cards visually "pop forward" in place. Move Play/Pass buttons into the main hand area with themed styling.

## Existing Code Inventory

Before implementing, note these existing elements that must be preserved or explicitly handled:

| Element | Location | Action |
|---------|----------|--------|
| `playCooldown` state | Line 67 | **Remove** - declared but never used for button disable |
| `prevBoardRef` / `prevLastRef` | Lines 69-70 | **Remove** - only used for cooldown detection |
| Cooldown `useEffect` | Lines 83-112 | **Remove** - cooldown feature not wired to buttons |
| `PLAY_COOLDOWN_MS` constant | Line 55 | **Remove** - unused after cooldown removal |
| `getFanStyle` function | Lines 159-174 | **Keep** - unchanged |

**Note:** The cooldown feature tracks plays/passes but never disables buttons. If cooldown behavior is desired later, it can be re-added. For this refactor, removing dead code.

## Changes

### 1. State Model (CardSpace.js)

**Current:** Two separate states
```javascript
const [listState, updateListState] = React.useState(cardObjects);
const [scratchState, updateScratchState] = React.useState([]);
```

**New:** Single state tracking selection via Set
```javascript
const [cards, setCards] = React.useState(cardObjects);
const [selectedIds, setSelectedIds] = React.useState(new Set());
```

Using a Set for selection keeps ReactSortable happy (it won't lose `selected` during drag operations).

**Remove these unused state/refs:**
```javascript
// DELETE these lines:
const [playCooldown, setPlayCooldown] = React.useState(false);
const prevBoardRef = React.useRef([]);
const prevLastRef = React.useRef([null, null, null, null]);
```

**Remove the cooldown useEffect (lines 83-112)** - it detects plays/passes but never disables anything.

### 2. State Synchronization with Server

The existing `useEffect` resets state when a new game starts. Update it to also sync cards with `cardObjects` when they change (after successful plays).

**Key considerations:**
- `cardObjects` prop may be a new array reference on every render even if content is unchanged
- Need to detect actual content changes, not just reference changes
- Must preserve user's drag-reordering while removing played cards

```javascript
const lastGameIdRef = React.useRef(null);
const lastCardIdsRef = React.useRef(new Set());

React.useEffect(() => {
  // Reset on new game
  if (gameData.gameId !== lastGameIdRef.current) {
    setCards(cardObjects);
    setSelectedIds(new Set());
    lastGameIdRef.current = gameData.gameId;
    lastCardIdsRef.current = new Set(cardObjects.map(c => c.id));
    return;
  }

  // Detect if cardObjects actually changed (cards played)
  const currentCardIds = new Set(cardObjects.map(c => c.id));
  const prevCardIds = lastCardIdsRef.current;

  // Check for actual difference in card IDs
  const cardsChanged = currentCardIds.size !== prevCardIds.size ||
    [...currentCardIds].some(id => !prevCardIds.has(id)) ||
    [...prevCardIds].some(id => !currentCardIds.has(id));

  if (cardsChanged) {
    // Preserve local ordering by filtering out cards no longer in hand
    setCards(prev => prev.filter(c => currentCardIds.has(c.id)));
    setSelectedIds(new Set());
    lastCardIdsRef.current = currentCardIds;
  }
}, [gameData.gameId, cardObjects]);
```

**Edge case - Server rejection:** If the server emits a `playError`, the `cardObjects` won't change, so selection remains intact for the user to adjust.

**Edge case - Empty hand:** When player plays their last cards and wins, `cards` becomes empty. The buttons should still render correctly (they're positioned absolutely).

### 3. Click Handler

Replace `addCardToScratch`/`returnCardToMain` with single toggle:
```javascript
function toggleCard(cardId) {
  setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(cardId) ? next.delete(cardId) : next.add(cardId);
    return next;
  });
}
```

Change from `onDoubleClick` to `onClick` on card wrappers.

**Edge case - Drag vs Click:** ReactSortable fires click events after drag ends. Add a drag guard:

```javascript
const isDraggingRef = React.useRef(false);

function handleCardClick(cardId) {
  // Ignore clicks that happen right after a drag
  if (isDraggingRef.current) {
    isDraggingRef.current = false;
    return;
  }
  toggleCard(cardId);
}
```

On ReactSortable, add:
```jsx
<ReactSortable
  onStart={() => { isDraggingRef.current = true; }}
  onEnd={() => {
    // Small delay to let click fire first, then reset
    setTimeout(() => { isDraggingRef.current = false; }, 50);
  }}
  ...
>
```

**Edge case - Selected cards during reorder:** When user drags a selected card to reorder, selection persists because `selectedIds` is a Set keyed by card ID, not array index.

**Edge case - Rapid clicking:** Multiple rapid clicks are handled correctly since `toggleCard` uses functional update (`prev => ...`) to avoid race conditions.

### 4. CardImage Component

Add `selected` prop that applies a -25px vertical offset (pops card up):
```javascript
function CardImage({ cardId, rotation, verticalOffset, selected }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const hoverLift = isHovered && !prefersReducedMotion ? -8 : 0;
  const hoverScale = isHovered && !prefersReducedMotion ? 1.05 : 1;
  // Selection offset respects reduced motion preference
  const selectionOffset = selected && !prefersReducedMotion ? -25 : 0;

  const handlePointerEnter = (e) => {
    if (e.pointerType === 'mouse') {
      setIsHovered(true);
    }
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
  };

  return (
    <img
      className={`box-shadow card-interactive card-fan ${selected ? 'card-selected' : ''}`}
      style={{
        width: '64px',
        height: 'auto',
        display: 'inline-block',
        // Consolidate verticalOffset into translateY (was using marginTop before)
        transform: `rotate(${rotation}deg) translateY(${verticalOffset + hoverLift + selectionOffset}px) scale(${hoverScale})`,
        transformOrigin: 'bottom center',
        // Remove marginTop - now using translateY for all vertical positioning
      }}
      alt={cardId}
      src={`cards/${cardId}.svg`}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    />
  );
}
```

**Note:** The current code uses `marginTop` for `verticalOffset` but `translateY` for hover. Consolidating into `translateY` enables smooth combined animations via CSS transitions. The existing `.card-fan` class already has `transition: transform 0.2s ease-out` which will animate selection smoothly.

### 5. Remove Staging Area

Delete the second `<div>` containing the staging ReactSortable (lines 181-251). Also remove:
- `stagedCardWidth` calculation (lines 91-95)
- `useableBoardWidth` calculation (line 91)
- `stagedNumberOfCards` variable (line 82)
- `addCardToScratch` function (lines 101-104)
- `returnCardToMain` function (lines 106-109)
- The entire staging `<ReactSortable>` component

Remove ReactSortable `group` config entirely (no longer needs cross-list dragging). Add `animation` prop for smooth reordering (the staging area had this, main list didn't):

```jsx
<ReactSortable
  className="dropzone"
  list={cards}
  setList={setCards}
  animation={150}
  onStart={() => { isDraggingRef.current = true; }}
  onEnd={() => { setTimeout(() => { isDraggingRef.current = false; }, 50); }}
  style={{ width: '100%', height: '100%', paddingTop: '25px', overflow: 'visible' }}
>
```

**UI improvement:** Current layout uses 120px (hand) + 100px (staging) = 220px vertical space. New layout uses single 140px area - cleaner and more compact.

### 6. Button Placement

Move Play/Pass buttons into the main hand container, positioned at the right edge. Use `position: relative` on parent for absolute positioning:

```jsx
<div
  style={{
    height: '140px',
    width: boardWidth + 'px',
    marginLeft: '10px',
    marginTop: '10px',
    overflow: 'visible',
    position: 'relative',  // For button positioning
  }}
>
  <ReactSortable ... >
    {/* cards */}
  </ReactSortable>

  <div style={{
    position: 'absolute',
    right: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: 20,  // Above cards that pop up (cards need z-index < 20)
  }}>
    <button
      className="game-btn game-btn-play"
      disabled={/* see validation */}
      onClick={submitHand}
    >
      Play
    </button>
    <button
      className="game-btn game-btn-pass"
      disabled={!isYourTurn || isFreePlay(gameData, seatIndex)}
      onClick={passTurn}
    >
      Pass
    </button>
  </div>
</div>
```

**Remove:** Semantic UI Button import (no longer needed). Verify no other Semantic UI components are used in this file before removing the import entirely.

### 7. Button Styling (index.css)

Themed buttons using game colors (green for play, slate for pass):
```css
.game-btn {
  min-width: 80px;
  padding: 10px 16px;
  font-weight: bold;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-out;
  font-family: inherit;
}

.game-btn-play {
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  color: white;
  border: 2px solid #1B5E20;
  box-shadow: 0 3px 6px rgba(0,0,0,0.3);
}

.game-btn-play:hover:not(:disabled) {
  background: linear-gradient(135deg, #66BB6A, #43A047);
  transform: translateY(-2px);
  box-shadow: 0 5px 10px rgba(0,0,0,0.4);
}

.game-btn-play:disabled {
  background: #9E9E9E;
  border-color: #757575;
  cursor: not-allowed;
  box-shadow: none;
}

.game-btn-pass {
  background: linear-gradient(135deg, #607D8B, #455A64);
  color: white;
  border: 2px solid #37474F;
  box-shadow: 0 3px 6px rgba(0,0,0,0.3);
}

.game-btn-pass:hover:not(:disabled) {
  background: linear-gradient(135deg, #78909C, #546E7A);
  transform: translateY(-2px);
}

.game-btn-pass:disabled {
  background: #9E9E9E;
  border-color: #757575;
  cursor: not-allowed;
  box-shadow: none;
}
```

### 8. Selected Card Styling (index.css)

Visual highlight for selected cards:
```css
.card-selected {
  box-shadow: 0 6px 12px rgba(0,0,0,0.4), 0 0 8px rgba(33,186,69,0.6) !important;
  outline: 2px solid #21ba45;
  outline-offset: -2px;
}
```

**Note:** Use `outline` instead of `border` to avoid layout shift. The `!important` ensures it overrides hover box-shadow.

**z-index handled via inline style** (see Section 8a) - CSS `z-index` alone won't create proper stacking when multiple cards are selected.

### 8a. z-index Stacking for Selected Cards

The current CSS has `.card-interactive:hover { z-index: 10; }` (line 89). Selected cards need higher z-index than hover to stay on top. Additionally, when multiple cards are selected, rightmost cards should stack on top of leftmost cards (natural overlap direction).

**Solution:** Apply z-index via inline style on the card wrapper div, based on selection state AND position:

```jsx
{cards.map((card, index) => {
  const isSelected = selectedIds.has(card.id);
  const { rotation, verticalOffset } = getFanStyle(index, cards.length);
  // Selected cards: 15 + index (so rightmost selected cards are on top)
  // Non-selected cards: index (maintains natural stacking)
  // Hover z-index (10) is below selected base (15)
  const zIndex = isSelected ? 15 + index : index;
  return (
    <div
      key={card.id}
      onClick={() => handleCardClick(card.id)}
      style={{
        width: cardWidth + 'px',
        height: 'auto',
        display: 'inline-block',
        margin: '2px',
        position: 'relative',
        zIndex,
      }}
    >
      <CardImage ... />
    </div>
  );
})}
```

**Update CSS** - change hover z-index to not override selected cards:
```css
/* In @media (hover: hover) block, update: */
.card-interactive:hover {
  filter: brightness(1.1);
  /* Remove z-index: 10 - handled by inline styles now */
}
```

**Alternative:** Keep `z-index: 10` for hover but ensure selected base is higher (15+). Current plan uses 15 as base which is safely above 10.

### 9. Clean Up Obsolete CSS

Remove `.card-staged` styles from index.css:
- Lines 96-99 (`.card-staged:hover` in the `@media (hover: hover)` block)
- Lines 107-110 (`.card-staged` transition)
- Line 242 in reduced motion section (reference to `.card-staged`)

**Update `.card-fan` transition** - remove `margin-top` since we're consolidating to `translateY`:
```css
/* Line 104 - change from: */
.card-fan {
  transition: transform 0.2s ease-out, margin-top 0.2s ease-out, box-shadow 0.2s ease-out;
}

/* To: */
.card-fan {
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
}
```

### 10. Submit Logic Update

```javascript
function submitHand() {
  const selectedCards = cards.filter(c => selectedIds.has(c.id));
  sendMessage('submitHand', selectedCards);
  // Don't clear local state here - let the server sync handle it
  // This prevents flash if server rejects the play
}

function passTurn() {
  sendMessage('passTurn');
}
```

**Why not clear selection immediately:** If the server rejects the play (invalid combination, not your turn due to race condition, etc.), the user's selection should remain so they can adjust. The state sync in `useEffect` only clears when `cardObjects` actually changes.

### 11. Validation Updates

Change `detectedHand` to use filtered selected cards:
```javascript
const selectedCards = cards.filter(c => selectedIds.has(c.id));
const detectedHand = getDetectedCards(selectedCards);
```

Button disabled conditions:
```javascript
disabled={
  detectedHand.rank === 0 ||
  !isYourTurn ||
  missingLowCard(gameData, selectedCards) ||
  restrictPlay(gameData, seatIndex, detectedHand)
}
```

**Note:** `selectedCards` is derived in render, not stored in state. This is intentional - it's a computed value that updates automatically when either `cards` or `selectedIds` changes.

### 12. Layout Adjustment

Increase main container height to 140px (from 120px) and add more top padding to accommodate cards popping up:

```jsx
style={{
  height: '140px',  // Was 120px
  ...
}}
```

On ReactSortable inner style:
```jsx
style={{
  width: '100%',
  height: '100%',
  paddingTop: '25px',  // Was 10px - headroom for 25px pop-up
  overflow: 'visible'
}}
```

### 13. Width Calculation Update

Remove staging-related width calculations. Update card area width to account for buttons:

```javascript
// Reserve space for buttons on the right
// Button: 80px min-width + 16px padding each side = 112px actual
// Plus 15px right margin + 10px safety buffer = ~140px total
const buttonAreaWidth = 140;
const cardAreaWidth = boardWidth - buttonAreaWidth;
let cardWidth = cardAreaWidth / (cards.length + 1);
if (cardWidth > 64) {
  cardWidth = 64;
}
```

**Comparison with current code:**
- Current: `cardAreaWidth = boardWidth - 148` (line 123)
- New: `cardAreaWidth = boardWidth - 140`

The values are similar. Current code reserved 148px for an unknown purpose (possibly buttons that were positioned differently). New calculation is explicit about button area.

Remove these lines:
- `const stagedNumberOfCards = scratchState.length;` (line 121)
- `const useableBoardWidth = boardWidth - 208;` (line 130)
- `let stagedCardWidth = ...` block (lines 131-134)

### 14. Touch Device Considerations

The existing pointer event handling for hover should work. For selection:
- Touch = tap fires onClick (works)
- Consider adding visual feedback for touch: tap highlight via CSS

```css
.card-interactive:active {
  filter: brightness(0.95);
}
```

**Edge case - Touch drag:** ReactSortable uses touch events for drag on mobile. The drag guard (`isDraggingRef`) works the same way - `onStart` fires at drag begin, `onEnd` at drag end, preventing accidental toggles.

### 15. Clear Selection Shortcut

With staging area removed, users need an easy way to deselect all cards if they change their mind. Clicking each card individually is tedious with many cards.

**Option A (Minimal):** Click on empty dropzone area clears selection:
```jsx
<ReactSortable
  ...
  onClick={(e) => {
    // Only clear if clicking the dropzone itself, not a card
    if (e.target.classList.contains('dropzone')) {
      setSelectedIds(new Set());
    }
  }}
>
```

**Option B (Better UX):** Add a small "Clear" link when cards are selected:
```jsx
{selectedIds.size > 0 && (
  <button
    className="clear-selection-btn"
    onClick={() => setSelectedIds(new Set())}
    style={{
      position: 'absolute',
      left: '15px',
      top: '5px',
      background: 'none',
      border: 'none',
      color: '#666',
      fontSize: '0.8rem',
      cursor: 'pointer',
      textDecoration: 'underline',
      zIndex: 20,
    }}
  >
    Clear ({selectedIds.size})
  </button>
)}
```

**Recommendation:** Implement Option A (click empty area) as baseline. Option B can be added if user feedback indicates need.

### 16. Remove PLAY_COOLDOWN_MS Constant

Delete line 55:
```javascript
// DELETE:
const PLAY_COOLDOWN_MS = 1200;
```

This constant was only used by the cooldown useEffect which is being removed. If cooldown is needed later, it can be re-added.

### 17. Keyboard Accessibility (Optional Enhancement)

For better accessibility, cards could be focusable and selectable via keyboard:

```jsx
<div
  role="button"
  tabIndex={0}
  onClick={() => handleCardClick(card.id)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(card.id);
    }
  }}
  ...
>
```

**Note:** This is a nice-to-have. Mark as stretch goal.

### 18. Reduced Motion Support

The existing `prefersReducedMotion` check disables hover animations. The CardImage component extends this to selection (see Section 4):

```javascript
const selectionOffset = selected && !prefersReducedMotion ? -25 : 0;
```

Selected cards will still show the green outline/glow (visual indicator via CSS) but won't animate upward.

Also add reduced motion handling for button hover:
```css
@media (prefers-reduced-motion: reduce) {
  .game-btn:hover:not(:disabled) {
    transform: none;
  }
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/CardSpace.js` | State model (selectedIds Set), remove cooldown code, update useEffect sync, add drag guard, click handlers, CardImage selected prop with translateY consolidation, remove staging area, add inline z-index, button placement, submit/validation logic, width calculations, remove Semantic UI import, add clear-on-dropzone-click |
| `src/index.css` | Add `.game-btn-*` styles (play/pass variants), `.card-selected` style (outline + shadow), `.card-interactive:active` style, update `.card-fan` transition (remove margin-top), remove `.card-staged` styles (3 locations), add reduced motion for buttons |

**No changes needed:**
- `src/util.js` - `missingLowCard`, `restrictPlay`, `isFreePlay` already work with any array of card objects
- `src/cardUtils/detectedCards.js` - `getDetectedCards` already accepts array of card objects

---

## Implementation Checklist

### CardSpace.js Changes
1. [ ] Update state model (cards + selectedIds replacing listState + scratchState)
2. [ ] Remove unused state/refs (playCooldown, prevBoardRef, prevLastRef)
3. [ ] Remove PLAY_COOLDOWN_MS constant
4. [ ] Remove cooldown useEffect (lines 83-112)
5. [ ] Add lastCardIdsRef for content change detection
6. [ ] Update gameId useEffect for server sync with proper change detection
7. [ ] Add isDraggingRef and click guard
8. [ ] Add toggleCard function
9. [ ] Replace addCardToScratch/returnCardToMain with handleCardClick
10. [ ] Update CardImage component (selected prop, consolidate marginTop to translateY, apply selectionOffset)
11. [ ] Remove staging area JSX (second div with ReactSortable)
12. [ ] Remove staging-related calculations (stagedNumberOfCards, useableBoardWidth, stagedCardWidth)
13. [ ] Remove group prop from ReactSortable
14. [ ] Add animation={150} to ReactSortable
15. [ ] Add onStart/onEnd handlers to ReactSortable for drag guard
16. [ ] Add inline z-index to card wrapper divs (Section 8a)
17. [ ] Change card wrapper from onDoubleClick to onClick
18. [ ] Add buttons inside main container with absolute positioning
19. [ ] Remove Semantic UI Button import
20. [ ] Update submitHand to use selectedCards
21. [ ] Update detectedHand calculation to use selectedCards
22. [ ] Update button disabled conditions to use selectedCards
23. [ ] Add clear selection on dropzone click (Option A from Section 15)
24. [ ] Adjust container height (120px -> 140px)
25. [ ] Adjust ReactSortable paddingTop (10px -> 25px)
26. [ ] Update cardAreaWidth calculation (remove 148, use 140 for buttonAreaWidth)

### index.css Changes
27. [ ] Add .game-btn base styles
28. [ ] Add .game-btn-play styles (gradient, hover, disabled)
29. [ ] Add .game-btn-pass styles (gradient, hover, disabled)
30. [ ] Add .card-selected styles (outline, box-shadow)
31. [ ] Add .card-interactive:active styles
32. [ ] Update .card-fan transition (remove margin-top)
33. [ ] Remove .card-staged:hover (lines 96-99)
34. [ ] Remove .card-staged transition (lines 107-110)
35. [ ] Remove .card-staged from reduced motion section (line 242)
36. [ ] Add reduced motion for .game-btn hover

---

## Verification

1. Run `npm run dev` and `npm run server-dev`
2. Join a game and verify:
   - Single click toggles cards forward/backward
   - Selected cards pop up visually with green outline
   - Selected cards have higher z-index (overlap correctly)
   - When hovering non-selected card near selected card, selected stays on top
   - Multiple selected cards: rightmost appears on top of leftmost
   - Clicking during/after drag does not toggle (drag guard works)
   - Play/Pass buttons appear at right side of hand area
   - Buttons are styled with green/slate gradients
   - Buttons have proper z-index (don't get covered by popped cards)
   - Drag-and-drop reordering still works with smooth animation
   - Selection persists after drag-reorder
   - After successful play, cards removed and selection cleared
   - After failed play (server error), selection remains
   - Validation still works (can't play invalid hands, must include lowest card first turn)
   - New game resets selection properly
   - Empty hand after winning doesn't cause errors
   - Clicking empty dropzone area clears all selections
3. Test on touch device:
   - Tap to select works
   - Drag to reorder works
   - No ghost clicks after drag
   - Visual feedback on tap (:active state)
4. Test reduced motion preference:
   - Cards show selection via outline/shadow without pop-up animation
   - Buttons don't translate on hover
5. Test window resize:
   - Cards reflow properly
   - Buttons stay positioned correctly
6. Console check:
   - No React warnings about state updates
   - No console errors during normal gameplay

---

## Edge Cases Summary

| Scenario | Handling |
|----------|----------|
| Server rejects play | Selection remains (cardObjects unchanged) |
| Drag then click | isDraggingRef blocks click for 50ms after drag |
| Reorder selected cards | Selection persists (keyed by ID, not index) |
| Rapid clicking | Functional state updates prevent race conditions |
| Empty hand (player wins) | Buttons still render, no cards to display |
| cardObjects prop reference changes | Compare by card IDs, not reference |
| Reduced motion preference | Selection shows outline only, no translateY animation |
| Touch devices | onClick fires on tap, drag guard handles touch drag |
| Multiple selected cards overlap | Rightmost cards get higher z-index (15 + index) |
| Hover vs selection z-index | Hover is z-index 10, selected base is 15 (selected wins) |
| User wants to deselect all | Click empty dropzone area clears selection |
| Many cards selected (13) | Clear shortcut prevents tedious individual clicks |

---

## Rollback Plan

If issues arise during or after implementation:

1. **Git branch strategy:** Create feature branch before starting
   ```bash
   git checkout -b refactor-hand-selection
   ```

2. **Incremental commits:** Commit after each major section works:
   - After state model change compiles
   - After CardImage changes work
   - After staging area removal
   - After buttons positioned
   - After CSS complete

3. **Quick rollback:** If major issues found post-merge
   ```bash
   git revert <commit-hash>
   ```

4. **Partial rollback:** If only CSS is problematic, CSS changes are isolated and can be reverted independently

---

## Potential Future Enhancements

- Invalid selection visual feedback (red tint when selected cards don't form valid hand)
- Keyboard navigation between cards (Tab to move, Enter/Space to select)
- "Select all" shortcut (Ctrl+A when hand is focused)
- Visible "Clear (n)" button instead of just empty-area click
- Haptic feedback on mobile selection
- Animation when cards are removed after successful play (fade out + slide)
- Card count badge showing "n selected" near buttons
- Undo last selection change
