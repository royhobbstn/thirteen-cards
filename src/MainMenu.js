import * as React from 'react';
import Settings from './Settings';
import { AboutModal } from './AboutModal';
import { Menu, Button, Icon, Header } from 'semantic-ui-react';
import { StatusBar } from './StatusBar';
import { getSeatIndex } from './util.js';

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
            <span style={{ color: 'darkslategray' }}>Room:</span>&nbsp;&nbsp;
            <span style={{ color: 'gray' }}>{roomNameLabel}</span>
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
            <Button style={{ marginRight: '10px' }} onClick={() => sendMessage('leaveGame', null)}>
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
