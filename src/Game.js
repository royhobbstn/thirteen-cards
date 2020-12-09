import * as React from 'react';
import { CardSpace } from './CardSpace';
import { Board } from './Board';
import { getSeatIndex } from './util.js';

export function Game({ socketRef, windowDimensions, gameData, sendMessage }) {
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
    </div>
  );
}
