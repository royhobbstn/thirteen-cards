import * as React from 'react';
import { getSafeUserName, getSafeColorChoice } from './util';

const NEW_CHAT_MESSAGE_EVENT = 'newChatMessage';

const useChat = socketRef => {
  const [messages, setMessages] = React.useState([]);

  React.useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleMessage = message => {
      const incomingMessage = {
        ...message,
        ownedByCurrentUser: message.senderId === socket.id,
        timestamp: Date.now(),
      };
      setMessages(messages => [...messages, incomingMessage]);
    };
    socket.on(NEW_CHAT_MESSAGE_EVENT, handleMessage);
    return () => {
      socket.off(NEW_CHAT_MESSAGE_EVENT, handleMessage);
    };
  }, [socketRef]);

  const sendMessage = messageBody => {
    socketRef.current.emit(NEW_CHAT_MESSAGE_EVENT, {
      body: messageBody,
      senderId: socketRef.current.id,
      userName: getSafeUserName(),
      colorChoice: getSafeColorChoice(),
    });
  };

  return { messages, sendMessage };
};

export default useChat;
