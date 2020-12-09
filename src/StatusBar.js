import * as React from 'react';
import { Menu, Button } from 'semantic-ui-react';
import { getLastPlay } from './util.js';

export function StatusBar({ gameData, socketRef, sendMessage, seatIndex }) {
  if (!gameData) {
    return null;
  }

  const isSeated = gameData.seated.some(seat => {
    return seat === socketRef.current.id;
  });

  console.log(gameData);

  const lastPlay = getLastPlay(gameData, seatIndex);

  console.log({ lastPlay });

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
      {gameData.stage === 'seating' && !isSeated ? (
        <Menu.Item header>Pick a Seat...</Menu.Item>
      ) : null}
      {gameData.rank[seatIndex] ? (
        <Menu.Item header>
          <span style={{ color: 'blue' }}>{getRank(gameData.rank[seatIndex])}</span>
        </Menu.Item>
      ) : null}
      {gameData.stage === 'game' && seatIndex !== null ? (
        seatIndex === gameData.turnIndex ? (
          <Menu.Item header>
            <span style={{ color: 'green' }}>Your Turn!</span>&nbsp;{' '}
            {lastPlay.play === 'Free Play' ? (
              <span style={{ color: 'black', fontWeight: 'bold' }}>{lastPlay.play}</span>
            ) : (
              <span style={{ fontWeight: '1', color: 'grey' }}>
                Board Is:{' '}
                <span style={{ color: 'black', fontWeight: 'bold' }}>{lastPlay.name}</span>
              </span>
            )}
          </Menu.Item>
        ) : (
          <Menu.Item header>
            <span style={{ color: 'red' }}>
              {gameData.aliases[gameData.seated[gameData.turnIndex]]}
            </span>{' '}
            &nbsp;playing ...
          </Menu.Item>
        )
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
