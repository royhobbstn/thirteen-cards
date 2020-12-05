import * as React from 'react';
import { Grid } from 'semantic-ui-react';
import { Game } from './Game';
import socketIOClient from 'socket.io-client';
import TabContainer from './TabContainer';

const Room = ({ match, roomNameLabel, updateRoomNameLabel, socketRef, windowDimensions }) => {
  const [socketReady, updateSocketReady] = React.useState(false);
  const roomName = match.params.roomId;

  React.useEffect(() => {
    socketRef.current = socketIOClient({
      query: {
        roomName,
        userName: localStorage.getItem('userName'),
        colorChoice: localStorage.getItem('colorChoice'),
      },
    });
    socketRef.current.on('connect', function () {
      updateSocketReady(true);
      // here send message to server to tell it to announce connection to everyone and send updated game state.
      socketRef.current.emit('announceConnection', null);
    });

    return () => {
      socketRef.current.disconnect();
      socketRef.current.removeAllListeners();
    };
  }, [roomName, socketRef]);

  // keep name in menu in sync with actual room name
  React.useEffect(() => {
    if (!roomNameLabel) {
      updateRoomNameLabel(roomName);
    }
  }, [roomName, roomNameLabel, updateRoomNameLabel]);

  return socketReady ? (
    <Grid>
      <Grid.Column width={10}>
        <Game socketRef={socketRef} windowDimensions={windowDimensions} />
      </Grid.Column>
      <Grid.Column width={6}>
        <TabContainer socketRef={socketRef} />
      </Grid.Column>
    </Grid>
  ) : null;
};

export default Room;
