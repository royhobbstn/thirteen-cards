import * as React from 'react';
import { CardSpace } from './CardSpace';
import { Board } from './Board';

export function Game({ socketRef, windowDimensions, gameData, sendMessage }) {
  if (!gameData) {
    return null;
  }

  const seatIndex = getSeatIndex();

  const cardObjects = (gameData.cards[seatIndex] || []).map(card => ({ id: card, name: card }));

  function getSeatIndex() {
    let seatIndex = null;
    for (let i = 0; i < gameData.seated.length; i++) {
      if (gameData.seated[i] === socketRef.current.id) {
        seatIndex = i;
      }
    }
    return seatIndex;
  }

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
      />
    </div>
  );
}
