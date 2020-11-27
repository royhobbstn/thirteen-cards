import * as React from 'react';
import useGame from './useGame';
import { StatusBar } from './StatusBar';
import { CardSpace } from './CardSpace';
import { Board } from './Board';

export function Game({ socketRef }) {
  const { gameData, sendMessage } = useGame(socketRef);

  if (!gameData) {
    return null;
  }

  const seatedCount = gameData.seated.reduce((acc, current) => {
    if (current !== null) {
      acc++;
    }
    return acc;
  }, 0);

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
      <StatusBar
        gameData={gameData}
        seatedCount={seatedCount}
        socketRef={socketRef}
        sendMessage={sendMessage}
        seatIndex={seatIndex}
      />

      <Board gameData={gameData} sendMessage={sendMessage} socketRef={socketRef} />

      <CardSpace seatIndex={seatIndex} stage={gameData.stage} cardObjects={cardObjects} />
    </div>
  );
}
