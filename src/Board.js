import * as React from 'react';
import { Button, Label } from 'semantic-ui-react';
import BackgroundImg from './images/table-bg.jpg';

const seatPositions = [
  { top: '10px', left: '260px', bottom: '', right: '' },
  { top: '110px', left: '', bottom: '', right: '10px' },
  { top: '', left: '260px', bottom: '10px', right: '' },
  { top: '110px', left: '10px', bottom: '', right: '' },
];

export function Board({ gameData, sendMessage, socketRef, windowDimensions }) {
  return (
    <div
      style={{
        position: 'relative',
        margin: 'auto',
        width: '100%',
        height: windowDimensions.height - 200 - 50 + 'px',
      }}
    >
      <div
        style={{
          position: 'relative',
          height: '100%',
          margin: '10px 20px 10px 10px',
          borderRadius: '15px',
          backgroundImage: `url(${BackgroundImg})`,
        }}
      >
        {gameData.board.map((card, index) => {
          return (
            <img
              key={card}
              style={{
                position: 'absolute',
                width: '56px',
                height: 'auto',
                top: '100px',
                left: 120 + 30 * index + 'px',
                display: 'inline-block',
              }}
              className="box-shadow"
              alt={card}
              src={`cards/${card}.svg`}
            />
          );
        })}
        {[0, 1, 2, 3].map(seatIndex => {
          return (
            <div
              key={seatIndex}
              style={{
                position: 'absolute',
                border:
                  gameData.turnIndex === seatIndex && gameData.stage === 'game'
                    ? '2px solid green'
                    : '1px solid grey',
                width: '80px',
                height: '80px',
                top: seatPositions[seatIndex].top,
                left: seatPositions[seatIndex].left,
                bottom: seatPositions[seatIndex].bottom,
                right: seatPositions[seatIndex].right,
              }}
            >
              <p>{gameData.cards[seatIndex] ? gameData.cards[seatIndex].length : '---'}</p>
              {gameData.seated[seatIndex] === null && gameData.stage === 'seating' ? (
                <Button size="tiny" onClick={() => sendMessage('chooseSeat', seatIndex)}>
                  Sit
                </Button>
              ) : null}
              {gameData.seated[seatIndex] === socketRef.current.id &&
              gameData.stage === 'seating' ? (
                <Button size="tiny" onClick={() => sendMessage('chooseSeat', seatIndex)}>
                  Stand Up
                </Button>
              ) : null}
              <p>{gameData.aliases[gameData.seated[seatIndex]]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
