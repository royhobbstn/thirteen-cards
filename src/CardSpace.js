import * as React from 'react';
import { ReactSortable } from 'react-sortablejs';
import { getDetectedCards } from './cardUtils/detectedCards';
import { restrictPlay, missingLowCard, isFreePlay } from './util.js';

function CardImage({ cardId, rotation, verticalOffset, selected, justSelected, isValidPlay }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Disable hover animations if user prefers reduced motion
  const hoverLift = isHovered && !prefersReducedMotion ? -10 : 0;
  const hoverScale = isHovered && !prefersReducedMotion ? 1.05 : 1;
  // Selection offset respects reduced motion preference
  const selectionOffset = selected && !prefersReducedMotion ? -33 : 0;

  // Handle both mouse and touch events, clear hover on touch end
  const handlePointerEnter = (e) => {
    if (e.pointerType === 'mouse') {
      setIsHovered(true);
    }
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
  };

  // Build class names
  const classNames = [
    'box-shadow',
    'card-interactive',
    'card-fan',
    selected ? 'card-selected' : '',
    justSelected ? 'card-selecting' : '',
    selected && isValidPlay ? 'valid-play-glow' : '',
  ].filter(Boolean).join(' ');

  return (
    <img
      className={classNames}
      style={{
        width: '85px',
        height: 'auto',
        display: 'inline-block',
        // Consolidate verticalOffset into translateY (was using marginTop before)
        transform: `rotate(${rotation}deg) translateY(${verticalOffset + hoverLift + selectionOffset}px) scale(${hoverScale})`,
        transformOrigin: 'bottom center',
      }}
      alt={cardId}
      src={`cards/${cardId}.svg`}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    />
  );
}

export function CardSpace({
  seatIndex,
  stage,
  cardObjects,
  sendMessage,
  gameData,
  windowDimensions,
}) {
  const [cards, setCards] = React.useState(cardObjects);
  const [selectedIds, setSelectedIds] = React.useState(new Set());
  const [justSelectedId, setJustSelectedId] = React.useState(null);
  const lastGameIdRef = React.useRef(null);
  const lastCardIdsRef = React.useRef(new Set());
  const isDraggingRef = React.useRef(false);
  const selectionTimerRef = React.useRef(null);

  // Reset card states when a new game starts, sync with server on card changes
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

  if (seatIndex === null) {
    return null;
  }

  // pane for table about 68.75% of total width
  const boardWidth = windowDimensions.width * 0.68 - 10;

  // Reserve space for buttons on the right
  const buttonAreaWidth = 140;
  const cardAreaWidth = boardWidth - buttonAreaWidth;
  let cardWidth = cardAreaWidth / (cards.length + 1);
  if (cardWidth > 85) {
    cardWidth = 85;
  }

  const selectedCards = cards.filter(c => selectedIds.has(c.id));
  const detectedHand = getDetectedCards(selectedCards);

  const isYourTurn = seatIndex === gameData.turnIndex;

  // Check if the current selection is a valid play
  const isValidSelection =
    selectedIds.size > 0 &&
    detectedHand.rank > 0 &&
    !missingLowCard(gameData, selectedCards) &&
    !restrictPlay(gameData, seatIndex, detectedHand);

  function toggleCard(cardId) {
    // Clear any pending selection animation timer
    if (selectionTimerRef.current) {
      clearTimeout(selectionTimerRef.current);
    }

    // Trigger bounce animation for the card being selected
    setJustSelectedId(cardId);
    selectionTimerRef.current = setTimeout(() => {
      setJustSelectedId(null);
      selectionTimerRef.current = null;
    }, 250);

    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(cardId) ? next.delete(cardId) : next.add(cardId);
      return next;
    });
  }

  function handleCardClick(cardId) {
    // Ignore clicks that happen right after a drag
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }
    toggleCard(cardId);
  }

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (selectionTimerRef.current) {
        clearTimeout(selectionTimerRef.current);
      }
    };
  }, []);

  function submitHand() {
    sendMessage('submitHand', selectedCards);
    // Don't clear local state here - let the server sync handle it
    // This prevents flash if server rejects the play
  }

  function passTurn() {
    sendMessage('passTurn');
  }

  function getFanStyle(index, totalCards) {
    if (totalCards <= 1) return { rotation: 0, verticalOffset: 0 };
    const middleIndex = (totalCards - 1) / 2;
    const offsetFromCenter = index - middleIndex;

    // Rotation: -12deg to +12deg across hand
    const maxRotation = Math.min(12, 80 / totalCards);
    const rotation = (offsetFromCenter / (totalCards - 1)) * maxRotation * 2;

    // Vertical offset: cards at edges drop lower (arc effect)
    const maxVerticalOffset = 15;
    const normalizedDistance = Math.abs(offsetFromCenter) / Math.max(middleIndex, 1);
    const verticalOffset = normalizedDistance * normalizedDistance * maxVerticalOffset;

    return { rotation, verticalOffset };
  }

  function handleDropzoneClick(e) {
    // Only clear if clicking the dropzone itself, not a card
    if (e.target.classList.contains('dropzone')) {
      setSelectedIds(new Set());
    }
  }

  return (
    <div>
      {seatIndex !== null && stage !== 'seating' ? (
        <div
          style={{
            height: '180px',
            width: boardWidth + 'px',
            marginLeft: '10px',
            marginTop: '10px',
            overflow: 'visible',
            position: 'relative',
          }}
        >
          <ReactSortable
            className="dropzone"
            list={cards}
            setList={setCards}
            animation={150}
            onStart={() => { isDraggingRef.current = true; }}
            onEnd={() => {
              // Small delay to let click fire first, then reset
              setTimeout(() => { isDraggingRef.current = false; }, 50);
            }}
            onClick={handleDropzoneClick}
            style={{ width: '100%', height: '100%', paddingTop: '25px', overflow: 'visible' }}
          >
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
                  <CardImage
                    cardId={card.id}
                    rotation={rotation}
                    verticalOffset={verticalOffset}
                    selected={isSelected}
                    justSelected={justSelectedId === card.id}
                    isValidPlay={isValidSelection && isYourTurn}
                  />
                </div>
              );
            })}
          </ReactSortable>

          <div style={{
            position: 'absolute',
            right: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 20,
          }}>
            <button
              className="game-btn game-btn-play"
              disabled={
                detectedHand.rank === 0 ||
                !isYourTurn ||
                missingLowCard(gameData, selectedCards) ||
                restrictPlay(gameData, seatIndex, detectedHand)
              }
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
      ) : null}
    </div>
  );
}
