import * as React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './Home';
import Room from './Room';
import MainMenu from './MainMenu';
import useGame from './useGame';
import { getSafeTheme, applyTheme } from './util';

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
  };
}

function App() {
  const socketRef = React.useRef(null);
  const [socketReady, updateSocketReady] = React.useState(false);
  const [roomNameLabel, updateRoomNameLabel] = React.useState('');
  const [windowDimensions, setWindowDimensions] = React.useState(getWindowDimensions());
  const { gameData, sendMessage } = useGame(socketRef, socketReady);

  React.useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Apply saved theme on mount
  React.useEffect(() => {
    applyTheme(getSafeTheme());
  }, []);

  return (
    <React.Fragment>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            fontFamily: 'var(--font-body, Inter, -apple-system, BlinkMacSystemFont, sans-serif)',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            background: 'var(--surface-card, #fff)',
            color: 'var(--color-gray-800, #1f2937)',
          },
          success: {
            iconTheme: {
              primary: '#21ba45',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ff4444',
              secondary: '#fff',
            },
          },
        }}
      />
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
                socketReady={socketReady}
                updateSocketReady={updateSocketReady}
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
