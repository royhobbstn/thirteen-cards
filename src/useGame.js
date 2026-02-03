import * as React from 'react';
import toast from 'react-hot-toast';
import { getSeatIndex } from './util.js';

const useGame = (socketRef, socketReady) => {
  const [gameData, setGameData] = React.useState(null);
  const prevTurnIndexRef = React.useRef(null);
  const prevStageRef = React.useRef(null);

  // the only message type sent back by server
  React.useEffect(() => {
    if (!socketReady) {
      return;
    }
    const socket = socketRef.current;
    socket.on('gameData', message => {
      setGameData(prevData => {
        // Guard: ensure socket is still connected
        if (!socketRef.current?.id) {
          return message;
        }

        // Check for turn change notifications
        const seatIndex = getSeatIndex(message, socketRef);

        // Only process turn notifications if player is seated (not a spectator)
        if (seatIndex !== null) {
          const isMyTurn = seatIndex === message.turnIndex;
          const wasMyTurn = prevData && seatIndex === prevData.turnIndex;

          // Only notify on turn change during active game
          if (message.stage === 'game' && prevData?.stage === 'game') {
            if (isMyTurn && !wasMyTurn && prevTurnIndexRef.current !== message.turnIndex) {
              toast('Your turn!', {
                icon: '🎴',
                duration: 2000,
                style: {
                  background: '#21ba45',
                  color: '#fff',
                  fontWeight: '600',
                },
              });
            }
          }
        }

        // Notify when game starts (for all connected users)
        if (message.stage === 'game' && prevStageRef.current === 'seating') {
          toast.success('Game started!', { duration: 2000 });
        }

        prevTurnIndexRef.current = message.turnIndex;
        prevStageRef.current = message.stage;
        return message;
      });
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
