import * as React from 'react';
import { CardSpace } from './CardSpace';
import { Board } from './Board';
import { GameOverModal } from './GameOverModal';
import { getSeatIndex } from './util.js';

export function Game({ socketRef, windowDimensions, gameData, sendMessage }) {
  const [showModal, setShowModal] = React.useState(false);

  // Show modal when game ends, hide when stage changes away from 'done'
  React.useEffect(() => {
    if (gameData?.stage === 'done') {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [gameData?.stage]);

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
    </div>
  );
}
