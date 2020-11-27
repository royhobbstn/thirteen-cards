import * as React from 'react';
import useGame from './useGame';
import { Button, Label } from 'semantic-ui-react';
import { StatusBar } from './StatusBar';

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

  function chooseSeat(seatIndex) {
    sendMessage('chooseSeat', seatIndex);
  }

  function setGameStatus(status) {
    sendMessage('setGameStatus', status);
  }

  return (
    <div>
      <StatusBar
        gameData={gameData}
        seatedCount={seatedCount}
        socketRef={socketRef}
        setGameStatus={setGameStatus}
      />

      <div
        style={{
          position: 'relative',
          marginLeft: '10px',
          width: '600px',
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

      <div>Cards</div>
      <img
        src="cards/9D.svg"
        style={{ width: '60px', height: 'auto' }}
        alt="Kiwi standing on oval"
      ></img>
    </div>
  );
}
