import * as React from 'react';
import { Grid } from 'semantic-ui-react';
import { Game } from './Game';
import socketIOClient from 'socket.io-client';
import TabContainer from './TabContainer';
import { getSafeUserName, getSafeColorChoice, getSafeLastKnownSocket } from './util';

const Room = ({
  match,
  roomNameLabel,
  updateRoomNameLabel,
  socketRef,
  windowDimensions,
  gameData,
  sendMessage,
  socketReady,
  updateSocketReady,
}) => {
  const roomName = match.params.roomId;

  React.useEffect(() => {
    socketRef.current = socketIOClient({
      query: {
        roomName,
        userName: getSafeUserName(),
        colorChoice: getSafeColorChoice(),
      },
    });
    socketRef.current.on('connect', function () {
      updateSocketReady(true);
      const lastKnownSocket = getSafeLastKnownSocket();
      localStorage.setItem('lastKnownSocket', socketRef.current.id);
      // here send message to server to tell it to announce connection to everyone and send updated game state.
      socketRef.current.emit('announceConnection', { lastKnownSocket });
    });

    return () => {
      socketRef.current.disconnect();
      socketRef.current.removeAllListeners();
    };
  }, [roomName, socketRef, updateSocketReady]);

  // keep name in menu in sync with actual room name
  React.useEffect(() => {
    if (!roomNameLabel) {
      updateRoomNameLabel(roomName);
    }
  }, [roomName, roomNameLabel, updateRoomNameLabel]);

  // Calculate board dimensions for skeleton
  let boardHeight = windowDimensions.height - 260;
  if (boardHeight < 250) {
    boardHeight = 250;
  }
  const boardWidth = windowDimensions.width * 0.68;

  // Show skeleton while connecting or waiting for initial game data
  if (!socketReady || !gameData) {
    return (
      <Grid>
        <Grid.Column width={11} style={{ paddingRight: '5px' }}>
          <div
            style={{
              position: 'relative',
              margin: 'auto',
              width: boardWidth + 'px',
              height: boardHeight + 'px',
            }}
          >
            <div
              className="skeleton skeleton-board"
              style={{
                height: '100%',
                margin: '0 0 10px 10px',
              }}
            />
          </div>
          <div
            className="skeleton skeleton-card-space"
            style={{
              width: boardWidth + 'px',
              marginLeft: '10px',
            }}
          />
        </Grid.Column>
        <Grid.Column width={5} style={{ paddingLeft: '5px' }}>
          <div className="skeleton skeleton-tab" style={{ margin: '10px' }} />
        </Grid.Column>
      </Grid>
    );
  }

  return (
    <Grid>
      <Grid.Column width={11} style={{ paddingRight: '5px' }}>
        <Game
          socketRef={socketRef}
          windowDimensions={windowDimensions}
          gameData={gameData}
          sendMessage={sendMessage}
        />
      </Grid.Column>
      <Grid.Column width={5} style={{ paddingLeft: '5px' }}>
        <TabContainer socketRef={socketRef} gameData={gameData} />
      </Grid.Column>
    </Grid>
  );
};

export default Room;
