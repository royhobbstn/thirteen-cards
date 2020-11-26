import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { Button, Input, Header } from 'semantic-ui-react';
import { v4 as uuid } from 'uuid';

const Home = () => {
  const history = useHistory();
  const [roomInput, setRoomInput] = React.useState('');

  const handleOnClick = () => {
    history.push(`/${roomInput}`);
  };

  const handleRoomNameChange = event => {
    setRoomInput(event.target.value);
  };

  const pressEnter = event => {
    if (event.charCode === 13) {
      event.preventDefault();
      handleOnClick();
    }
  };

  const fillWithRandomValue = () => {
    const randomValue = uuid().slice(0, 6);
    setRoomInput(randomValue);
  };

  return (
    <div style={{ width: '350px', margin: '50px auto 30px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Header style={{ display: 'block', margin: 'auto' }} size="medium">
          Enter a Room Name
        </Header>
      </div>
      <br />
      <Input
        style={{ width: '100%' }}
        type="text"
        placeholder="Room"
        value={roomInput}
        onKeyPress={pressEnter}
        onChange={handleRoomNameChange}
      />
      <br />
      <Button
        style={{ display: 'block', width: '250px', margin: '20px auto' }}
        onClick={() => fillWithRandomValue()}
      >
        Fill with Random Value
      </Button>

      <p>When in the room, you can copy the URL and share it with your team.</p>
      <br />
      <Button
        style={{ display: 'block', margin: '10px auto' }}
        disabled={!Boolean(roomInput)}
        onClick={() => handleOnClick()}
      >
        Go To Room
      </Button>
    </div>
  );
};

export default Home;
