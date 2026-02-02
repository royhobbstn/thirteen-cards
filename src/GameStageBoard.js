import * as React from 'react';
import { Button, Icon } from 'semantic-ui-react';

export function GameStageBoard({ gameData, sendMessage, socketRef, seatIndex }) {
  const isOccupied = gameData.seated[seatIndex] !== null;
  const isActiveTurn = isOccupied && seatIndex === gameData.turnIndex;
  const isSelf = gameData.seated[seatIndex] === socketRef.current.id;
  const turnClass = isActiveTurn ? (isSelf ? 'active-turn-self' : 'active-turn') : '';

  return (
    <div className={turnClass}>
      {gameData.seated[seatIndex] === null ? (
        <Button disabled>
          <Button.Content>
            <Icon name="user outline" size="big" color="grey" />
          </Button.Content>
        </Button>
      ) : null}
      {gameData.seated[seatIndex] !== null &&
      gameData.seated[seatIndex] !== socketRef.current.id ? (
        <Button animated="fade">
          <Button.Content hidden>{gameData.cards[seatIndex]?.length ?? 0}</Button.Content>
          <Button.Content visible>
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
    </div>
  );
}
