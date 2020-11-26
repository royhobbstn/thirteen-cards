import * as React from 'react';
import { Form, TextArea, List } from 'semantic-ui-react';
import useChat from './useChat';

export function Chat({ socketRef }) {
  const { messages, sendMessage } = useChat(socketRef);
  const [newMessage, setNewMessage] = React.useState('');
  const messagesEndRef = React.createRef();

  React.useEffect(() => {
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  // value in message textarea
  const handleNewMessageChange = event => {
    setNewMessage(event.target.value);
  };

  const pressEnter = event => {
    if (!newMessage.trim()) {
      return;
    }
    if (event.charCode === 13) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    sendMessage(newMessage);
    setNewMessage('');
  };

  return (
    <div
      style={{
        margin: '10px',
      }}
    >
      <div
        style={{
          padding: '5px',
          border: '1px solid lightgrey',
          overflowY: 'scroll',
          borderRadius: '5px',
          height: '50vh',
          backgroundColor: 'white',
        }}
      >
        <List className="scrolling content">
          {messages.map((message, i) => (
            <List.Item key={i}>
              <span style={getMessageNameStyle(message)}>
                {message.userName && `${message.userName}: `}
              </span>
              <span style={{ marginLeft: '10px', ...getMessageTextStyle(message) }}>
                {message.body}
              </span>
            </List.Item>
          ))}
          <div ref={messagesEndRef} />
        </List>
      </div>
      <Form>
        <TextArea
          style={{ margin: '5px 0' }}
          value={newMessage}
          onChange={handleNewMessageChange}
          onKeyPress={pressEnter}
          placeholder="Write message..."
        />
      </Form>
    </div>
  );
}

function getMessageNameStyle(message) {
  return { color: message.colorChoice, fontWeight: 'bold' };
}

function getMessageTextStyle(message) {
  if (!message.userName) {
    return { color: 'dimgrey', fontStyle: 'italic' };
  }
  return { color: 'darkslategrey' };
}
