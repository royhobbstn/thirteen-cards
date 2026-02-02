import * as React from 'react';
import { ReactSortable } from 'react-sortablejs';
import { Button } from 'semantic-ui-react';
import { getDetectedCards } from './cardUtils/detectedCards';
import { restrictPlay, missingLowCard, isFreePlay } from './util.js';

function CardImage({ cardId, rotation, verticalOffset }) {
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
  const hoverLift = isHovered && !prefersReducedMotion ? -8 : 0;
  const hoverScale = isHovered && !prefersReducedMotion ? 1.05 : 1;

  // Handle both mouse and touch events, clear hover on touch end
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
      className="box-shadow card-interactive card-fan"
      style={{
        width: '64px',
        height: 'auto',
        display: 'inline-block',
        transform: `rotate(${rotation}deg) translateY(${hoverLift}px) scale(${hoverScale})`,
        transformOrigin: 'bottom center',
        marginTop: `${verticalOffset}px`,
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
  const [listState, updateListState] = React.useState(cardObjects);
  const [scratchState, updateScratchState] = React.useState([]);
  const lastGameIdRef = React.useRef(null);

  // Reset card states when a new game starts
  React.useEffect(() => {
    if (gameData.gameId !== lastGameIdRef.current) {
      updateListState(cardObjects);
      updateScratchState([]);
      lastGameIdRef.current = gameData.gameId;
    }
  }, [gameData.gameId, cardObjects]);

  if (seatIndex === null) {
    return null;
  }

  // pane for table about 62.5% of total width
  const boardWidth = windowDimensions.width * 0.62 - 10;
  const numberOfCards = listState.length;
  const stagedNumberOfCards = scratchState.length;

  const cardAreaWidth = boardWidth - 148;
  let cardWidth = cardAreaWidth / (numberOfCards + 1);
  if (cardWidth > 64) {
    cardWidth = 64;
  }

  // extra space for submit / pass buttons
  const useableBoardWidth = boardWidth - 208;
  let stagedCardWidth = useableBoardWidth / (stagedNumberOfCards + 1);
  if (stagedCardWidth > 64) {
    stagedCardWidth = 64;
  }

  const detectedHand = getDetectedCards(scratchState);

  const isYourTurn = seatIndex === gameData.turnIndex;

  function addCardToScratch(card) {
    updateScratchState([...scratchState, { id: card, name: card }]);
    updateListState([...listState.filter(d => d.id !== card)]);
  }

  function returnCardToMain(card) {
    updateListState([...listState, { id: card, name: card }]);
    updateScratchState([...scratchState.filter(d => d.id !== card)]);
  }

  function submitHand() {
    sendMessage('submitHand', scratchState);
    updateScratchState([]);
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

  return (
    <div>
      {seatIndex !== null && stage !== 'seating' ? (
        <div>
          <div
            style={{
              height: '120px',
              width: boardWidth + 'px',
              marginLeft: '10px',
              marginTop: '10px',
              overflow: 'visible',
            }}
          >
            <ReactSortable
              className="dropzone"
              group={{ name: 'mainlist', put: true, pull: ['scratchlist'] }}
              list={listState}
              setList={updateListState}
              style={{ width: '100%', height: '100%', paddingTop: '10px', overflow: 'visible' }}
            >
              {listState.map((card, index) => {
                const { rotation, verticalOffset } = getFanStyle(index, listState.length);
                return (
                  <div
                    onDoubleClick={() => addCardToScratch(card.id)}
                    key={card.id}
                    style={{
                      width: cardWidth + 'px',
                      height: 'auto',
                      display: 'inline-block',
                      margin: '2px',
                      position: 'relative',
                    }}
                  >
                    <CardImage
                      cardId={card.id}
                      rotation={rotation}
                      verticalOffset={verticalOffset}
                    />
                  </div>
                );
              })}
            </ReactSortable>
          </div>
          <div
            style={{
              height: '100px',
              width: boardWidth + 'px',
              marginLeft: '10px',
              marginTop: '10px',
              position: 'relative',
            }}
          >
            <ReactSortable
              className="dropzone"
              group={{ name: 'scratchlist', put: true, pull: ['mainlist'] }}
              list={scratchState}
              setList={updateScratchState}
              animation="150"
              style={{
                width: '100%',
                height: '100px',
                position: 'absolute',
                top: '0',
                left: '0',
                overflow: 'visible',
              }}
            >
              {scratchState.map(card => {
                return (
                  <div
                    onDoubleClick={() => returnCardToMain(card.id)}
                    key={card.id}
                    style={{
                      width: stagedCardWidth + 'px',
                      height: 'auto',
                      display: 'inline-block',
                      margin: '2px',
                      position: 'relative',
                    }}
                  >
                    <img
                      className="box-shadow card-interactive card-staged"
                      style={{
                        width: '64px',
                        height: 'auto',
                        display: 'inline-block',
                      }}
                      alt={card.id}
                      src={`cards/${card.id}.svg`}
                    />
                  </div>
                );
              })}
            </ReactSortable>
            <Button
              style={{ position: 'absolute', top: '5px', right: '5px', width: '100px' }}
              disabled={
                detectedHand.rank === 0 ||
                !isYourTurn ||
                missingLowCard(gameData, scratchState) ||
                restrictPlay(gameData, seatIndex, detectedHand)
              }
              onClick={() => submitHand()}
            >
              Play
            </Button>
            <Button
              style={{ position: 'absolute', bottom: '5px', right: '5px', width: '100px' }}
              disabled={!isYourTurn || isFreePlay(gameData, seatIndex)}
              onClick={() => passTurn()}
            >
              Pass
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
