import * as React from 'react';
import useGame from './useGame';
import { Button, Label } from 'semantic-ui-react';
import { StatusBar } from './StatusBar';
import { CardSpace } from './CardSpace';

const seatPositions = [
  { top: '10px', left: '260px', bottom: '', right: '' },
  { top: '110px', left: '', bottom: '', right: '10px' },
  { top: '', left: '260px', bottom: '10px', right: '' },
  { top: '110px', left: '10px', bottom: '', right: '' },
];

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

  function chooseSeat(seatIndex) {
    sendMessage('chooseSeat', seatIndex);
  }

  function setGameStatus(status) {
    sendMessage('setGameStatus', status);
  }

  function leaveGame() {
    sendMessage('leaveGame', null);
  }

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
        setGameStatus={setGameStatus}
        leaveGame={leaveGame}
        seatIndex={seatIndex}
      />

      <div
        style={{
          position: 'relative',
          marginLeft: '10px',
          width: '780px',
          height: '300px',
          border: '1px solid red',
        }}
      >
        {[0, 1, 2, 3].map(seatIndex => {
          return (
            <div
              key={seatIndex}
              style={{
                position: 'absolute',
                border: '1px solid green',
                width: '80px',
                height: '80px',
                top: seatPositions[seatIndex].top,
                left: seatPositions[seatIndex].left,
                bottom: seatPositions[seatIndex].bottom,
                right: seatPositions[seatIndex].right,
              }}
            >
              {gameData.seated[seatIndex] === null && gameData.stage === 'seating' ? (
                <Button size="tiny" onClick={() => chooseSeat(seatIndex)}>
                  Sit
                </Button>
              ) : null}
              {gameData.seated[seatIndex] === socketRef.current.id &&
              gameData.stage === 'seating' ? (
                <Button size="tiny" onClick={() => chooseSeat(seatIndex)}>
                  Stand Up
                </Button>
              ) : null}
              <Label>{gameData.seated[seatIndex]}</Label>
            </div>
          );
        })}
      </div>

      <CardSpace seatIndex={seatIndex} stage={gameData.stage} cardObjects={cardObjects} />
    </div>
  );
}
