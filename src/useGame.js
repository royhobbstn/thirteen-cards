import * as React from 'react';

const useGame = socketRef => {
  const [gameData, setGameData] = React.useState(null);

  // the only message type sent back by server
  React.useEffect(() => {
    socketRef.current.on('gameData', message => {
      setGameData(message);
    });
  }, [socketRef]);

  // generic message sender
  const sendMessage = (messageType, messageBody) => {
    // some messages should be reflected immediately in game data.
    // do that here

    // todo Later

    // then send the message to the server

    socketRef.current.emit(messageType, {
      body: messageBody,
      senderId: socketRef.current.id,
    });
  };

  return { gameData, sendMessage };
};

export default useGame;
