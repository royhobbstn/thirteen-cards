import * as React from 'react';
import toast from 'react-hot-toast';

const useGame = (socketRef, socketReady) => {
  const [gameData, setGameData] = React.useState(null);
  const prevStageRef = React.useRef(null);

  // the only message type sent back by server
  React.useEffect(() => {
    if (!socketReady) {
      return;
    }
    const socket = socketRef.current;
    socket.on('gameData', message => {
      // Check for game start transition before updating state
      const shouldNotifyGameStart =
        message.stage === 'game' && prevStageRef.current === 'seating';

      prevStageRef.current = message.stage;
      setGameData(message);

      // Notify after state update to avoid setState during render
      if (shouldNotifyGameStart) {
        toast.success('Game started!', { duration: 2000 });
      }
    });
    socket.on('playError', message => {
      console.warn('Play rejected:', message.message);
      toast.error(message.message || 'Invalid play', { duration: 3000 });
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
