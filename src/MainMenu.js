import * as React from 'react';
import Settings from './Settings';
import { AboutModal } from './AboutModal';
import { Menu, Button, Icon, Header, Popup } from 'semantic-ui-react';
import { StatusBar } from './StatusBar';
import { getSeatIndex } from './util.js';

function ConnectionIndicator({ socketRef }) {
  const [isConnected, setIsConnected] = React.useState(false);
  const [isReconnecting, setIsReconnecting] = React.useState(false);

  React.useEffect(() => {
    const checkSocket = () => {
      const socket = socketRef.current;
      if (!socket) {
        setIsConnected(false);
        setIsReconnecting(false);
        return null;
      }
      setIsConnected(socket.connected);
      return socket;
    };

    const socket = checkSocket();
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      setIsReconnecting(false);
    };
    const handleDisconnect = () => {
      setIsConnected(false);
    };
    const handleReconnecting = () => {
      setIsReconnecting(true);
    };
    const handleReconnectFailed = () => {
      setIsReconnecting(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.io.on('reconnect_attempt', handleReconnecting);
    socket.io.on('reconnect_failed', handleReconnectFailed);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.io.off('reconnect_attempt', handleReconnecting);
      socket.io.off('reconnect_failed', handleReconnectFailed);
    };
  }, [socketRef]);

  const getStatusInfo = () => {
    if (isConnected) return { color: '#21ba45', glow: 'rgba(33, 186, 69, 0.5)', text: 'Connected' };
    if (isReconnecting)
      return { color: '#f2711c', glow: 'rgba(242, 113, 28, 0.5)', text: 'Reconnecting...' };
    return { color: '#db2828', glow: 'rgba(219, 40, 40, 0.5)', text: 'Disconnected' };
  };

  const status = getStatusInfo();

  return (
    <Popup
      content={status.text}
      trigger={
        <span
          role="status"
          aria-label={`Connection status: ${status.text}`}
          style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: status.color,
            boxShadow: `0 0 6px 2px ${status.glow}`,
            marginLeft: '8px',
            transition: 'all 0.3s ease',
          }}
        />
      }
      position="bottom center"
      size="mini"
    />
  );
}

const MainMenu = ({ roomNameLabel, socketRef, gameData, sendMessage }) => {
  const [aboutModalOpen, updateAboutModalOpen] = React.useState(false);
  const [settingsAreVisible, updateSettingsAreVisible] = React.useState(false);

  React.useEffect(() => {
    const userName = localStorage.getItem('userName');
    const colorChoice = localStorage.getItem('colorChoice');
    if (!userName || !colorChoice) {
      updateSettingsAreVisible(true);
    }
  }, [settingsAreVisible, updateSettingsAreVisible]);

  let seatedCount = 0;
  let seatIndex = null;
  if (gameData) {
    seatedCount = gameData.seated.reduce((acc, current) => {
      if (current !== null) {
        acc++;
      }
      return acc;
    }, 0);
    seatIndex = getSeatIndex(gameData, socketRef);
  }

  return (
    <React.Fragment>
      <AboutModal aboutModalOpen={aboutModalOpen} updateAboutModalOpen={updateAboutModalOpen} />
      <Settings
        settingsAreVisible={settingsAreVisible}
        updateSettingsAreVisible={updateSettingsAreVisible}
        socketRef={socketRef}
      />
      <Menu>
        <Menu.Item header>
          <Header size="medium">Thirteen</Header>
        </Menu.Item>
        {roomNameLabel ? (
          <Menu.Item header>
            <span style={{ color: 'var(--color-gray-600)' }}>Room:</span>&nbsp;&nbsp;
            <span style={{ color: 'var(--color-gray-500)' }}>{roomNameLabel}</span>
            <ConnectionIndicator socketRef={socketRef} />
          </Menu.Item>
        ) : null}

        <StatusBar
          gameData={gameData}
          socketRef={socketRef}
          sendMessage={sendMessage}
          seatIndex={seatIndex}
        />

        <Menu.Item position="right">
          {gameData && gameData.stage === 'seating' && seatedCount >= 2 ? (
            <Button
              style={{ marginRight: '10px' }}
              onClick={() => sendMessage('setGameStatus', 'game')}
            >
              Start Game
            </Button>
          ) : null}
          {gameData && gameData.stage === 'game' && seatIndex !== null ? (
            <Button style={{ marginRight: '10px' }} onClick={() => sendMessage('forfeit', null)}>
              Forfeit
            </Button>
          ) : null}
          <Button style={{ marginRight: '10px' }} icon onClick={() => updateAboutModalOpen(true)}>
            <Icon name="question circle outline" />
          </Button>
          <Button icon onClick={() => updateSettingsAreVisible(true)}>
            <Icon name="setting" />
          </Button>
        </Menu.Item>
      </Menu>
    </React.Fragment>
  );
};

export default MainMenu;
