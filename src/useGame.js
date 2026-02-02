import * as React from 'react';

const useGame = (socketRef, socketReady) => {
  const [gameData, setGameData] = React.useState(null);

  // the only message type sent back by server
  React.useEffect(() => {
    if (!socketReady) {
      return;
    }
    const socket = socketRef.current;
    socket.on('gameData', message => {
      setGameData(message);
    });
    socket.on('playError', message => {
      console.warn('Play rejected:', message.message);
    });
    return () => {
      socket.off('gameData');
      socket.off('playError');
    };
  }, [socketRef, socketReady]);

  const sendMessage = (messageType, messageBody) => {
    socketRef.current.emit(messageType, {
      body: messageBody,
      senderId: socketRef.current.id,
    });
  };

  return { gameData, sendMessage };
};

export default useGame;
