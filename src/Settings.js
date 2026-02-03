import * as React from 'react';
import { Input, Button, Grid, Modal } from 'semantic-ui-react';
import { ChromePicker } from 'react-color';
import { getSafeUserName, getSafeColorChoice, getSafeTheme, applyTheme } from './util';

const Settings = ({ settingsAreVisible, updateSettingsAreVisible, socketRef }) => {
  const [userName, updateUserName] = React.useState(getSafeUserName());
  const [colorChoice, updateColorChoice] = React.useState(() => {
    const saved = getSafeColorChoice();
    if (saved) return saved;
    const color = getRandomColor();
    localStorage.setItem('colorChoice', color);
    return color;
  });
  const [colorPickerVisible, setColorPickerVisible] = React.useState(false);
  const [theme, setTheme] = React.useState(getSafeTheme());

  // Sync theme state when modal becomes visible
  React.useEffect(() => {
    if (settingsAreVisible) {
      setTheme(getSafeTheme());
    }
  }, [settingsAreVisible]);

  const updateNameInput = evt => {
    updateUserName(evt.target.value);
  };

  const handleThemeChange = newTheme => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const clickButtonOkay = () => {
    localStorage.setItem('userName', userName);
    localStorage.setItem('colorChoice', colorChoice);
    updateSettingsAreVisible(false);
    if (socketRef && socketRef.current) {
      socketRef.current.emit('updateSettings', { userName, colorChoice });
    }
  };

  const handleKeyDown = event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      clickButtonOkay();
    }
  };

  return (
    <Modal size="tiny" open={settingsAreVisible}>
      <Modal.Header>Settings</Modal.Header>
      <div
        style={{
          margin: '40px auto',
          width: '400px',
          border: '1px dotted var(--color-gray-400)',
          padding: '20px',
          borderRadius: '8px',
        }}
      >
        <Input
          label="Username: "
          type="text"
          placeholder="Enter a User Name"
          value={userName}
          onChange={updateNameInput}
          onKeyDown={handleKeyDown}
        />
        <div style={{ margin: '20px auto 0 auto' }}>
          <Grid>
            <Grid.Row>
              <Grid.Column width={16}>
                <p>Chat Text Color:</p>
                <div style={{ marginLeft: '15px' }}>
                  <Button onClick={() => setColorPickerVisible(!colorPickerVisible)}>
                    <span
                      style={{
                        display: 'block',
                        width: '30px',
                        height: '20px',
                        backgroundColor: colorChoice,
                      }}
                    ></span>
                  </Button>
                  {colorPickerVisible ? (
                    <div style={{ position: 'absolute', float: 'right', zIndex: '500' }}>
                      <ChromePicker
                        color={colorChoice}
                        onChangeComplete={c => updateColorChoice(c.hex)}
                      />
                    </div>
                  ) : null}
                </div>
              </Grid.Column>
            </Grid.Row>
            <Grid.Row>
              <Grid.Column width={16}>
                <p>Theme:</p>
                <div style={{ marginLeft: '15px', display: 'flex', gap: '8px' }}>
                  <Button
                    basic={theme !== 'light'}
                    primary={theme === 'light'}
                    size="small"
                    onClick={() => handleThemeChange('light')}
                  >
                    ☀️ Light
                  </Button>
                  <Button
                    basic={theme !== 'dark'}
                    primary={theme === 'dark'}
                    size="small"
                    onClick={() => handleThemeChange('dark')}
                  >
                    🌙 Dark
                  </Button>
                  <Button
                    basic={theme !== 'system'}
                    primary={theme === 'system'}
                    size="small"
                    onClick={() => handleThemeChange('system')}
                  >
                    💻 System
                  </Button>
                </div>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </div>
      </div>
      <Modal.Actions>
        <Button disabled={!Boolean(userName)} onClick={() => clickButtonOkay()}>
          OK
        </Button>
      </Modal.Actions>
    </Modal>
  );
};

export default Settings;

function getRandomColor() {
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += Math.floor(Math.random() * 10);
  }
  return color;
}
