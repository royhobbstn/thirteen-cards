import * as React from 'react';
import { Form, TextArea, List, Icon } from 'semantic-ui-react';
import useChat from './useChat';
import { getInitials, formatRelativeTime } from './util';

function ChatAvatar({ name, color, isSystem }) {
  if (isSystem) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-gray-400)',
          color: '#fff',
          marginRight: '10px',
          flexShrink: 0,
        }}
      >
        <Icon name="info" size="small" style={{ margin: 0 }} />
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        backgroundColor: color || 'var(--color-gray-400)',
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.7rem',
        marginRight: '10px',
        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </span>
  );
}

// tick prop triggers re-render from parent interval
function Timestamp({ time, tick: _tick }) {
  if (!time) return null;

  return (
    <span
      style={{
        fontSize: '0.7rem',
        color: 'var(--color-gray-400)',
        marginLeft: 'auto',
        flexShrink: 0,
        paddingLeft: '8px',
      }}
    >
      {formatRelativeTime(time)}
    </span>
  );
}

export function Chat({ socketRef }) {
  const { messages, sendMessage } = useChat(socketRef);
  const [newMessage, setNewMessage] = React.useState('');
  const [timestampTick, setTimestampTick] = React.useState(0);
  const messagesEndRef = React.useRef(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Single interval for all timestamps - updates every minute
  React.useEffect(() => {
    const interval = setInterval(() => setTimestampTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // value in message textarea
  const handleNewMessageChange = event => {
    setNewMessage(event.target.value);
  };

  const handleKeyDown = event => {
    if (!newMessage.trim()) {
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    sendMessage(newMessage);
    setNewMessage('');
  };

  const isSystemMessage = message => message.type === 'gamelog' || !message.userName;

  return (
    <div
      style={{
        margin: '10px',
      }}
    >
      <div
        className="chat-messages-container"
        style={{
          padding: '8px',
          border: '1px solid var(--color-gray-200)',
          overflowY: 'auto',
          borderRadius: '8px',
          height: '50vh',
          backgroundColor: 'var(--surface-card)',
        }}
      >
        <List className="scrolling content" style={{ margin: 0 }}>
          {messages.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--color-gray-400)',
              }}
            >
              <Icon name="comments outline" size="big" style={{ marginBottom: '10px' }} />
              <p>No messages yet</p>
            </div>
          )}
          {messages.map((message, i) => (
            <List.Item
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                padding: '6px 4px',
                borderRadius: '6px',
                marginBottom: '4px',
                backgroundColor: message.ownedByCurrentUser
                  ? 'rgba(33, 133, 208, 0.08)'
                  : 'transparent',
              }}
            >
              <ChatAvatar
                name={message.userName}
                color={message.colorChoice}
                isSystem={isSystemMessage(message)}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                {isSystemMessage(message) ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={getMessageTextStyle(message)}>{message.body}</span>
                    <Timestamp time={message.timestamp} tick={timestampTick} />
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={getMessageNameStyle(message)}>{message.userName}</span>
                      <Timestamp time={message.timestamp} tick={timestampTick} />
                    </div>
                    <div style={{ ...getMessageTextStyle(message), marginTop: '2px' }}>
                      {message.body}
                    </div>
                  </>
                )}
              </div>
            </List.Item>
          ))}
          <div ref={messagesEndRef} />
        </List>
      </div>
      <Form>
        <TextArea
          style={{
            margin: '8px 0',
            borderRadius: '8px',
            resize: 'none',
          }}
          rows={2}
          value={newMessage}
          onChange={handleNewMessageChange}
          onKeyDown={handleKeyDown}
          placeholder="Write message..."
        />
      </Form>
    </div>
  );
}

function getMessageNameStyle(message) {
  return {
    color: message.colorChoice || 'var(--color-gray-600)',
    fontWeight: 600,
    fontSize: '0.85rem',
  };
}

function getMessageTextStyle(message) {
  if (message.type === 'gamelog') {
    return { color: 'var(--color-gamelog, #4a7c59)', fontStyle: 'italic', fontSize: '0.85em' };
  }
  if (!message.userName) {
    return { color: 'var(--color-gray-500)', fontStyle: 'italic', fontSize: '0.85em' };
  }
  return { color: 'var(--color-gray-700)', fontSize: '0.9rem' };
}
