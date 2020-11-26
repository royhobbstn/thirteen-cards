import * as React from 'react';

const NEW_CHAT_MESSAGE_EVENT = 'newChatMessage';

const useChat = socketRef => {
  const [messages, setMessages] = React.useState([]);

  React.useEffect(() => {
    socketRef.current.on(NEW_CHAT_MESSAGE_EVENT, message => {
      const incomingMessage = {
        ...message,
        ownedByCurrentUser: message.senderId === socketRef.current.id,
      };
      setMessages(messages => [...messages, incomingMessage]);
    });
  }, [socketRef]);

  const sendMessage = messageBody => {
    socketRef.current.emit(NEW_CHAT_MESSAGE_EVENT, {
      body: messageBody,
      senderId: socketRef.current.id,
      userName: localStorage.getItem('userName'),
      colorChoice: localStorage.getItem('colorChoice'),
    });
  };

  return { messages, sendMessage };
};

export default useChat;
