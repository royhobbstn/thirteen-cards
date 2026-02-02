import * as React from 'react';
import BackgroundImg from './images/table-bg.jpg';
import { SeatingStageBoard } from './SeatingStageBoard';
import { GameStageBoard } from './GameStageBoard';

// Minimum delay between plays (ms)
const PLAY_COOLDOWN_MS = 1200;

// Format the play announcement text based on play type
const formatPlayAnnouncement = lastPlay => {
  if (!lastPlay || lastPlay === 'pass') return null;

  const playType = lastPlay.play;
  const name = lastPlay.name;

  // Special styling for bombs
  if (playType === 'Bomb') {
    return { text: 'BOMB!', isBomb: true, subtext: name };
  }

  // Use the detailed name for all plays
  return { text: name, isBomb: false, subtext: null };
};

// Get animation class based on which seat played
const getAnimationClass = seat => {
  const classes = [
    'board-card-from-top',
    'board-card-from-right',
    'board-card-from-bottom',
    'board-card-from-left',
  ];
  return classes[seat] ?? 'board-card';
};

export function Board({ gameData, sendMessage, socketRef, windowDimensions }) {
  const prevBoardRef = React.useRef([]);
  const prevTurnIndexRef = React.useRef(null);
  const prevLastForPassRef = React.useRef([null, null, null, null]);

  const [animatingCards, setAnimatingCards] = React.useState(new Set());
  const [lastPlayedSeat, setLastPlayedSeat] = React.useState(null);
  const [playAnnouncement, setPlayAnnouncement] = React.useState(null);
  const [announcementKey, setAnnouncementKey] = React.useState(0);
  const [passIndicator, setPassIndicator] = React.useState(null);
  const [justPlayedSeat, setJustPlayedSeat] = React.useState(null);
  const [playCooldown, setPlayCooldown] = React.useState(false);

  // Track who just played cards
  React.useEffect(() => {
    const prevBoard = prevBoardRef.current;
    const currentBoard = gameData.board;
    const timeouts = [];

    // Find new cards that weren't in the previous board
    const newCards = currentBoard.filter(card => !prevBoard.includes(card));

    if (newCards.length > 0) {
      // The previous turn holder is the one who just played
      const whoPlayed = prevTurnIndexRef.current;
      setLastPlayedSeat(whoPlayed);
      setJustPlayedSeat(whoPlayed);

      setAnimatingCards(new Set(newCards));

      // Start cooldown to prevent rapid plays
      setPlayCooldown(true);
      timeouts.push(setTimeout(() => setPlayCooldown(false), PLAY_COOLDOWN_MS));

      // Show announcement for ALL plays (not just special ones)
      const lastPlay = gameData.last?.[whoPlayed];
      const announcement = formatPlayAnnouncement(lastPlay);
      if (whoPlayed !== null && announcement) {
        setPlayAnnouncement(announcement);
        setAnnouncementKey(k => k + 1);
        timeouts.push(setTimeout(() => setPlayAnnouncement(null), 2000));
      }

      // Clear animation state after animation completes (longer duration now)
      timeouts.push(
        setTimeout(() => {
          setAnimatingCards(new Set());
          setJustPlayedSeat(null);
        }, 600 + newCards.length * 80)
      ); // base duration + stagger

      prevBoardRef.current = currentBoard;
    }

    prevTurnIndexRef.current = gameData.turnIndex;

    return () => timeouts.forEach(t => clearTimeout(t));
  }, [gameData.board, gameData.turnIndex, gameData.last]);

  // Track pass actions (separate effect with its own ref to avoid race conditions)
  React.useEffect(() => {
    const prevLast = prevLastForPassRef.current;
    const currentLast = gameData.last ?? [null, null, null, null];
    const timeouts = [];

    for (let i = 0; i < 4; i++) {
      // Detect when a seat changes to 'pass' (wasn't 'pass' before)
      if (currentLast[i] === 'pass' && prevLast[i] !== 'pass') {
        setPassIndicator(i);
        timeouts.push(setTimeout(() => setPassIndicator(null), 1500));

        // Start cooldown for pass actions too
        setPlayCooldown(true);
        timeouts.push(setTimeout(() => setPlayCooldown(false), PLAY_COOLDOWN_MS));
        break;
      }
    }

    prevLastForPassRef.current = [...currentLast];

    return () => timeouts.forEach(t => clearTimeout(t));
  }, [gameData.last]);

  // Reset animation state when game stage changes (e.g., new game starts)
  React.useEffect(() => {
    if (gameData.stage !== 'game') {
      setAnimatingCards(new Set());
      setLastPlayedSeat(null);
      setPlayAnnouncement(null);
      setPassIndicator(null);
      setJustPlayedSeat(null);
      setPlayCooldown(false);
      prevBoardRef.current = [];
      prevTurnIndexRef.current = null;
      prevLastForPassRef.current = [null, null, null, null];
    }
  }, [gameData.stage]);
  let boardHeight = windowDimensions.height - 260;
  if (boardHeight < 250) {
    boardHeight = 250;
  }

  // pane for table about 68.75% of total width
  let boardWidth = windowDimensions.width * 0.68;

  const iconWidth = 78;
  const iconHeight = 50;
  const cardHeight = 120;
  const rawCardWidth = 85;
  const margins = 50;

  const potentialCardArea = boardWidth - 2 * iconWidth - margins - rawCardWidth;

  let cardWidth = rawCardWidth;
  const numberBoardCards = gameData.board.length;
  if (numberBoardCards * cardWidth > potentialCardArea) {
    cardWidth = potentialCardArea / numberBoardCards;
  }

  const cardArea = cardWidth * numberBoardCards + (rawCardWidth - cardWidth);

  const leftPos = boardWidth / 2 - iconWidth / 2;
  const cardLeft = boardWidth / 2 - cardArea / 2;
  const topPos = boardHeight / 2 - iconHeight / 2;
  const cardPos = boardHeight / 2 - cardHeight / 2;

  const seatPositions = [
    { top: '10px', left: leftPos + 'px', bottom: '', right: '' },
    { top: topPos + 'px', left: '', bottom: '', right: '10px' },
    { top: '', left: leftPos + 'px', bottom: '10px', right: '' },
    { top: topPos + 'px', left: '10px', bottom: '', right: '' },
  ];

  const leftName = boardWidth / 2 - iconWidth / 2 + 5;
  const topName = boardHeight / 2 - iconHeight;
  const bottomName = 15 + iconHeight;
  const rightMarginName = 20;
  const leftMarginName = 15;
  const topMarginName = 15 + iconHeight;

  const namePositions = [
    { top: topMarginName + 'px', left: leftName + 'px', bottom: '', right: '', textAlign: 'left' },
    {
      top: topName + 'px',
      left: '',
      bottom: '',
      right: rightMarginName + 'px',
      textAlign: 'right',
    },
    { top: '', left: leftName + 'px', bottom: bottomName + 'px', right: '', textAlign: 'left' },
    { top: topName + 'px', left: leftMarginName + 'px', bottom: '', right: '', textAlign: 'left' },
  ];

  return (
    <div
      style={{
        position: 'relative',
        margin: 'auto',
        width: boardWidth + 'px',
        height: boardHeight + 'px',
      }}
    >
      <div
        style={{
          position: 'relative',
          height: '100%',
          margin: '0 0 10px 10px',
          borderRadius: '15px',
          backgroundImage: `url(${BackgroundImg})`,
        }}
      >
        {gameData.board.map((card, index) => {
          const shouldAnimate = animatingCards.has(card);
          const animationClass = shouldAnimate
            ? lastPlayedSeat !== null
              ? getAnimationClass(lastPlayedSeat)
              : 'board-card'
            : '';
          return (
            <div
              className={animationClass}
              key={card}
              style={{
                width: '85px',
                height: 'auto',
                margin: '2px',
                position: 'absolute',
                top: cardPos + 'px',
                left: cardLeft + cardWidth * index + 'px',
                display: 'inline-block',
                animationDelay: shouldAnimate ? `${index * 0.05}s` : undefined,
              }}
            >
              <img
                className="box-shadow"
                style={{
                  width: '85px',
                  height: 'auto',
                  display: 'inline-block',
                }}
                alt={card}
                src={`cards/${card}.svg`}
              />
            </div>
          );
        })}
        {[0, 1, 2, 3].map(seatIndex => {
          return (
            <div
              key={seatIndex}
              style={{
                position: 'absolute',
                top: seatPositions[seatIndex].top,
                left: seatPositions[seatIndex].left,
                bottom: seatPositions[seatIndex].bottom,
                right: seatPositions[seatIndex].right,
              }}
            >
              {gameData.stage === 'seating' || gameData.stage === 'done' ? (
                <SeatingStageBoard
                  seatIndex={seatIndex}
                  gameData={gameData}
                  sendMessage={sendMessage}
                  socketRef={socketRef}
                />
              ) : null}
              {gameData.stage === 'game' ? (
                <GameStageBoard
                  seatIndex={seatIndex}
                  gameData={gameData}
                  sendMessage={sendMessage}
                  socketRef={socketRef}
                  justPlayed={justPlayedSeat === seatIndex}
                />
              ) : null}
              {/* Pass indicator near seat */}
              {passIndicator === seatIndex && (
                <div
                  className="pass-indicator"
                  style={{
                    top: seatIndex === 0 ? '60px' : seatIndex === 2 ? '-25px' : '50%',
                    left: seatIndex === 3 ? '90px' : seatIndex === 1 ? '-50px' : '50%',
                    transform:
                      seatIndex === 0 || seatIndex === 2 ? 'translateX(-50%)' : 'translateY(-50%)',
                  }}
                >
                  PASS
                </div>
              )}
            </div>
          );
        })}
        {[0, 1, 2, 3].map(seatIndex => {
          return (
            <div
              key={seatIndex}
              style={{
                position: 'absolute',
                top: namePositions[seatIndex].top,
                left: namePositions[seatIndex].left,
                bottom: namePositions[seatIndex].bottom,
                right: namePositions[seatIndex].right,
              }}
            >
              {gameData.seated[seatIndex] ? (
                <p className="textstroke" style={{ textAlign: namePositions[seatIndex].textAlign }}>
                  {gameData.aliases[gameData.seated[seatIndex]]}
                </p>
              ) : null}
            </div>
          );
        })}
        {/* Play type announcement overlay */}
        {playAnnouncement && (
          <div
            key={announcementKey}
            className={`play-announcement${playAnnouncement.isBomb ? ' bomb' : ''}`}
          >
            <div className="play-announcement-text">{playAnnouncement.text}</div>
            {playAnnouncement.subtext && (
              <div className="play-announcement-subtext">{playAnnouncement.subtext}</div>
            )}
          </div>
        )}
        {/* Cooldown indicator */}
        {playCooldown && <div className="cooldown-overlay" />}
      </div>
    </div>
  );
}
