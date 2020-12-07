import * as React from 'react';
import BackgroundImg from './images/table-bg.jpg';
import { SeatingStageBoard } from './SeatingStageBoard';
import { GameStageBoard } from './GameStageBoard';

export function Board({ gameData, sendMessage, socketRef, windowDimensions }) {
  let boardHeight = windowDimensions.height - 200 - 50;
  if (boardHeight < 300) {
    boardHeight = 300;
  }

  // pane for table about 62.5% of total width
  let boardWidth = windowDimensions.width * 0.62;

  const iconWidth = 78;
  const iconHeight = 50;
  const cardHeight = 90;
  const rawCardWidth = 64;
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
          return (
            <div
              key={card}
              style={{
                width: '64px',
                height: 'auto',
                margin: '2px',
                position: 'absolute',
                top: cardPos + 'px',
                left: cardLeft + cardWidth * index + 'px',
                display: 'inline-block',
              }}
            >
              <img
                className="box-shadow"
                key={card}
                style={{
                  width: '64px',
                  height: 'auto',
                  display: 'inline-block',
                }}
                className="box-shadow"
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
                />
              ) : null}
              {/* <p>{gameData.cards[seatIndex] ? gameData.cards[seatIndex].length : '---'}</p> */}
              {/* <p>{gameData.aliases[gameData.seated[seatIndex]]}</p> */}
            </div>
          );
        })}
      </div>
    </div>
  );
}
