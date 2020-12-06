import * as React from 'react';
import { Button, Icon } from 'semantic-ui-react';

export function GameStageBoard({ gameData, sendMessage, socketRef, seatIndex }) {
  return (
    <React.Fragment>
      {gameData.seated[seatIndex] === null ? (
        <Button disabled>
          <Button.Content>
            <Icon name="user outline" size="big" color="grey" />
          </Button.Content>
        </Button>
      ) : null}
      {gameData.seated[seatIndex] !== null &&
      gameData.seated[seatIndex] !== socketRef.current.id ? (
        <Button disabled>
          <Button.Content>
            <Icon name="user" size="big" color="black" />
          </Button.Content>
        </Button>
      ) : null}
      {gameData.seated[seatIndex] === socketRef.current.id ? (
        <Button disabled>
          <Button.Content>
            <Icon name="user" size="big" color="green" />
          </Button.Content>
        </Button>
      ) : null}
      {/* <p>{gameData.aliases[gameData.seated[seatIndex]]}</p> */}
    </React.Fragment>
  );
}
