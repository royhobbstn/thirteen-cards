import * as React from 'react';
import { Input, Button, Grid, Modal } from 'semantic-ui-react';
import { ChromePicker } from 'react-color';

const Settings = ({ settingsAreVisible, updateSettingsAreVisible, socketRef }) => {
  const [userName, updateUserName] = React.useState(localStorage.getItem('userName') || '');
  const [colorChoice, updateColorChoice] = React.useState(localStorage.getItem('colorChoice'));
  const [colorPickerVisible, setColorPickerVisible] = React.useState(false);

  if (!colorChoice) {
    const color = getRandomColor();
    localStorage.setItem('colorChoice', color);
    updateColorChoice(color);
  }

  const updateNameInput = evt => {
    updateUserName(evt.target.value);
  };

  const clickButtonOkay = () => {
    localStorage.setItem('userName', userName);
    localStorage.setItem('colorChoice', colorChoice);
    updateSettingsAreVisible(false);
    if (socketRef && socketRef.current) {
      socketRef.current.emit('updateSettings', { userName, colorChoice });
    }
  };

  const pressEnter = event => {
    if (event.charCode === 13) {
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
          border: '1px dotted grey',
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
          onKeyPress={pressEnter}
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
