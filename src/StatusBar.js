import * as React from 'react';
import { Menu, Button } from 'semantic-ui-react';

export function StatusBar({ gameData, socketRef, sendMessage }) {
  if (!gameData) {
    return null;
  }

  const isSeated = gameData.seated.some(seat => {
    return seat === socketRef.current.id;
  });

  const seatIndex = getSeatIndex();

  function getSeatIndex() {
    let seatIndex = null;
    for (let i = 0; i < gameData.seated.length; i++) {
      if (gameData.seated[i] === socketRef.current.id) {
        seatIndex = i;
      }
    }
    return seatIndex;
  }

  const seatedCount = gameData.seated.reduce((acc, current) => {
    if (current !== null) {
      acc++;
    }
    return acc;
  }, 0);

  console.log(gameData);

  return (
    <React.Fragment>
      {gameData.stage === 'done' ? (
        <React.Fragment>
          <Menu.Item header>Game Has Been Completed</Menu.Item>
          {seatIndex ? <Menu.Item header>Your Rank {gameData.rank[seatIndex]}</Menu.Item> : null}
          <Menu.Item position="right">
            <Button onClick={() => sendMessage('setGameStatus', 'seating')}>Clear Game</Button>
          </Menu.Item>
        </React.Fragment>
      ) : null}
      {gameData.stage === 'seating' ? (
        <React.Fragment>
          {!isSeated ? <Menu.Item header>Pick a Seat...</Menu.Item> : null}
          {seatedCount >= 2 ? (
            <Menu.Item position="right">
              <Button onClick={() => sendMessage('setGameStatus', 'game')}>Start Game</Button>
            </Menu.Item>
          ) : null}
        </React.Fragment>
      ) : null}
      {gameData.rank[seatIndex] ? (
        <Menu.Item header>
          <span style={{ color: 'blue' }}>{getRank(gameData.rank[seatIndex])}</span>
        </Menu.Item>
      ) : null}
      {gameData.stage === 'game' && seatIndex !== null ? (
        <React.Fragment>
          {seatIndex === gameData.turnIndex ? (
            <Menu.Item header>
              <span style={{ color: 'green' }}>Your Turn!</span> Playing ..todo..
            </Menu.Item>
          ) : (
            <Menu.Item header>
              {gameData.aliases[gameData.seated[gameData.turnIndex]]} playing ..todo..
            </Menu.Item>
          )}
          <Menu.Item position="right">
            <Button onClick={() => sendMessage('leaveGame', null)}>Leave</Button>
          </Menu.Item>
        </React.Fragment>
      ) : null}
    </React.Fragment>
  );
}

function getRank(rank) {
  switch (rank) {
    case 1:
      return '1st place!!';
    case 2:
      return '2nd place';
    case 3:
      return '3rd place';
    case 4:
      return 'Last place';

    default:
      return 'Unexpected';
  }
}
