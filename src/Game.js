import * as React from 'react';
import { Icon } from 'semantic-ui-react';
import { CardSpace } from './CardSpace';
import { Board } from './Board';
import { GameOverModal } from './GameOverModal';
import { getSeatIndex } from './util.js';

export function Game({ socketRef, windowDimensions, gameData, sendMessage }) {
  const [showModal, setShowModal] = React.useState(false);
  const [showYourTurn, setShowYourTurn] = React.useState(false);
  const [yourTurnKey, setYourTurnKey] = React.useState(0);
  const prevTurnIndexRef = React.useRef(null);
  const prevStageRef = React.useRef(null);

  // Show modal when game ends, hide when stage changes away from 'done'
  React.useEffect(() => {
    if (gameData?.stage === 'done') {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [gameData?.stage]);

  // Show "Your Turn" banner when it becomes the user's turn
  React.useEffect(() => {
    if (!gameData || gameData.stage !== 'game') {
      prevTurnIndexRef.current = null;
      prevStageRef.current = gameData?.stage;
      return;
    }

    const currentSeatIndex = getSeatIndex(gameData, socketRef);
    const isMyTurn = currentSeatIndex === gameData.turnIndex;
    const wasMyTurn = currentSeatIndex === prevTurnIndexRef.current;
    const wasGameStage = prevStageRef.current === 'game';
    const gameJustStarted = prevStageRef.current === 'seating' && gameData.stage === 'game';

    // Update refs first (before any early returns)
    prevTurnIndexRef.current = gameData.turnIndex;
    prevStageRef.current = gameData.stage;

    // Show banner if:
    // 1. It just became my turn (turn changed to me), OR
    // 2. Game just started and it's my turn
    const turnChangedToMe = isMyTurn && !wasMyTurn && wasGameStage;
    const myTurnOnGameStart = isMyTurn && gameJustStarted;

    if (turnChangedToMe || myTurnOnGameStart) {
      setShowYourTurn(true);
      setYourTurnKey(k => k + 1);
      const timer = setTimeout(() => setShowYourTurn(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [gameData, socketRef]);

  if (!gameData) {
    return null;
  }

  const seatIndex = getSeatIndex(gameData, socketRef);

  const cardObjects = (gameData.cards[seatIndex] || []).map(card => ({ id: card, name: card }));

  return (
    <div>
      <Board
        gameData={gameData}
        sendMessage={sendMessage}
        socketRef={socketRef}
        windowDimensions={windowDimensions}
      />

      <CardSpace
        gameData={gameData}
        seatIndex={seatIndex}
        stage={gameData.stage}
        cardObjects={cardObjects}
        sendMessage={sendMessage}
        windowDimensions={windowDimensions}
      />

      {showModal && (
        <GameOverModal
          gameData={gameData}
          socketRef={socketRef}
          sendMessage={sendMessage}
          onClose={() => setShowModal(false)}
        />
      )}

      {showYourTurn && (
        <div key={yourTurnKey} className="your-turn-banner">
          <Icon name="star" className="your-turn-banner-icon" />
          Your Turn!
        </div>
      )}
    </div>
  );
}
