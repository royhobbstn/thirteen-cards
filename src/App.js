import * as React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import Home from './Home';
import Room from './Room';
import MainMenu from './MainMenu';
import useGame from './useGame';

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
  };
}

function App() {
  const socketRef = React.useRef(null);
  const [roomNameLabel, updateRoomNameLabel] = React.useState('');
  const [windowDimensions, setWindowDimensions] = React.useState(getWindowDimensions());
  const { gameData, sendMessage } = useGame(socketRef);

  React.useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <React.Fragment>
      <MainMenu
        roomNameLabel={roomNameLabel}
        socketRef={socketRef}
        gameData={gameData}
        sendMessage={sendMessage}
      />
      <Router>
        <Switch>
          <Route exact path="/" render={() => <Home />} />
          <Route
            exact
            path="/:roomId"
            render={props => (
              <Room
                {...props}
                roomNameLabel={roomNameLabel}
                updateRoomNameLabel={updateRoomNameLabel}
                socketRef={socketRef}
                windowDimensions={windowDimensions}
                gameData={gameData}
                sendMessage={sendMessage}
              />
            )}
          />
        </Switch>
      </Router>
    </React.Fragment>
  );
}

export default App;
