import * as React from 'react';
import { Button, Icon } from 'semantic-ui-react';
import BackgroundImg from './images/table-bg.jpg';

export function Board({ gameData, sendMessage, socketRef, windowDimensions }) {
  let boardHeight = windowDimensions.height - 200 - 50;
  if (boardHeight < 300) {
    boardHeight = 300;
  }

  // pane for table about 62.5% of total width
  let boardWidth = windowDimensions.width * 0.62;

  const iconWidth = 78;
  const iconHeight = 50;

  const leftPos = boardWidth / 2 - iconWidth / 2;
  const topPos = boardHeight / 2 - iconHeight / 2;

  const seatPositions = [
    { top: '10px', left: leftPos + 'px', bottom: '', right: '' },
    { top: topPos + 'px', left: '', bottom: '', right: '10px' },
    { top: '', left: leftPos + 'px', bottom: '10px', right: '' },
    { top: topPos + 'px', left: '10px', bottom: '', right: '' },
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
          margin: '10px 0 10px 10px',
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
                top: seatPositions[seatIndex].top,
                left: seatPositions[seatIndex].left,
                bottom: seatPositions[seatIndex].bottom,
                right: seatPositions[seatIndex].right,
              }}
            >
              {/* <p>{gameData.cards[seatIndex] ? gameData.cards[seatIndex].length : '---'}</p> */}
              {gameData.seated[seatIndex] === null && gameData.stage === 'seating' ? (
                <Button animated="fade" onClick={() => sendMessage('chooseSeat', seatIndex)}>
                  <Button.Content hidden>Sit</Button.Content>
                  <Button.Content visible>
                    <Icon name="user outline" size="big" color="grey" />
                  </Button.Content>
                </Button>
              ) : null}
              {gameData.seated[seatIndex] !== null &&
              gameData.stage === 'seating' &&
              gameData.seated[seatIndex] !== socketRef.current.id ? (
                <Button disabled>
                  <Button.Content>
                    <Icon name="user" size="big" color="black" />
                  </Button.Content>
                </Button>
              ) : null}
              {gameData.seated[seatIndex] === socketRef.current.id &&
              gameData.stage === 'seating' ? (
                <Button animated="fade" onClick={() => sendMessage('chooseSeat', seatIndex)}>
                  <Button.Content hidden>Stand Up</Button.Content>
                  <Button.Content visible>
                    <Icon name="user" size="big" color="green" />
                  </Button.Content>
                </Button>
              ) : null}
              {/* <p>{gameData.aliases[gameData.seated[seatIndex]]}</p> */}
            </div>
          );
        })}
      </div>
    </div>
  );
}
