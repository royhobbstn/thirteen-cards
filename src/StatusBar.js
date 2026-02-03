import * as React from 'react';
import { Menu } from 'semantic-ui-react';
import { getLastPlay } from './util.js';

export function StatusBar({ gameData, socketRef, sendMessage, seatIndex }) {
  if (!gameData) {
    return null;
  }

  const isSeated = gameData.seated.some(seat => {
    return seat === socketRef.current.id;
  });

  const lastPlay = getLastPlay(gameData, seatIndex);

  return (
    <React.Fragment>
      {gameData.stage === 'done' ? <Menu.Item header>Game Has Been Completed</Menu.Item> : null}
      {gameData.stage === 'seating' && !isSeated ? (
        <Menu.Item header>Pick a Seat...</Menu.Item>
      ) : null}
      {gameData.rank[seatIndex] ? (
        <Menu.Item header>
          <span style={{ color: 'var(--color-info)' }}>{getRank(gameData.rank[seatIndex])}</span>
        </Menu.Item>
      ) : null}
      {gameData.stage === 'game' && seatIndex !== null ? (
        seatIndex === gameData.turnIndex ? (
          <Menu.Item header>
            <span style={{ color: 'var(--color-success)' }}>Your Turn!</span>&nbsp;{' '}
            {lastPlay.play === 'Free Play' ? (
              <span style={{ color: 'var(--color-gray-800)', fontWeight: 'bold' }}>{lastPlay.play}</span>
            ) : (
              <span style={{ fontWeight: '1', color: 'var(--color-gray-500)' }}>
                Board Is:{' '}
                <span style={{ color: 'var(--color-gray-800)', fontWeight: 'bold' }}>{lastPlay.name}</span>
              </span>
            )}
          </Menu.Item>
        ) : (
          <Menu.Item header>
            <span style={{ color: 'var(--color-warning)' }}>
              {gameData.seated[gameData.turnIndex] === 'disconnected'
                ? 'Disconnected player'
                : gameData.aliases[gameData.seated[gameData.turnIndex]] || 'Unknown'}
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
