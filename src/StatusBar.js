import * as React from 'react';
import { Menu, Button } from 'semantic-ui-react';

export function StatusBar({
  gameData,
  seatedCount,
  socketRef,
  setGameStatus,
  leaveGame,
  seatIndex,
}) {
  const isSeated = gameData.seated.some(seat => {
    return seat === socketRef.current.id;
  });

  return (
    <Menu style={{ marginLeft: '10px', width: '600px' }}>
      {gameData.stage === 'seating' ? (
        <React.Fragment>
          {!isSeated ? <Menu.Item header>Pick a Seat...</Menu.Item> : null}
          {seatedCount >= 2 ? (
            <Menu.Item position="right">
              <Button onClick={() => setGameStatus('game')}>Start Game</Button>
            </Menu.Item>
          ) : null}
        </React.Fragment>
      ) : null}
      {gameData.stage === 'game' && seatIndex !== null ? (
        <React.Fragment>
          <Menu.Item position="right">
            <Button onClick={() => leaveGame()}>Leave</Button>
          </Menu.Item>
        </React.Fragment>
      ) : null}
    </Menu>
  );
}
