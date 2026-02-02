import * as React from 'react';
import { Button, Icon } from 'semantic-ui-react';
import { isAiSeat } from './util';

export function GameStageBoard({ gameData, sendMessage, socketRef, seatIndex }) {
  const seatId = gameData.seated[seatIndex];
  const isOccupied = seatId !== null;
  const isActiveTurn = isOccupied && seatIndex === gameData.turnIndex;
  const isSelf = seatId === socketRef.current.id;
  const isAi = isAiSeat(seatId);
  const turnClass = isActiveTurn ? (isSelf ? 'active-turn-self' : 'active-turn') : '';

  return (
    <div className={turnClass}>
      {/* Empty seat */}
      {seatId === null && (
        <Button disabled>
          <Button.Content>
            <Icon name="user outline" size="big" color="grey" />
          </Button.Content>
        </Button>
      )}

      {/* AI player */}
      {isAi && (
        <Button animated="fade">
          <Button.Content hidden>{gameData.cards[seatIndex]?.length ?? 0}</Button.Content>
          <Button.Content visible>
            <Icon name="robot" size="big" color="blue" />
          </Button.Content>
        </Button>
      )}

      {/* Other human player */}
      {isOccupied && !isSelf && !isAi && (
        <Button animated="fade">
          <Button.Content hidden>{gameData.cards[seatIndex]?.length ?? 0}</Button.Content>
          <Button.Content visible>
            <Icon name="user" size="big" color="black" />
          </Button.Content>
        </Button>
      )}

      {/* Me */}
      {isSelf && (
        <Button disabled>
          <Button.Content>
            <Icon name="user" size="big" color="green" />
          </Button.Content>
        </Button>
      )}
    </div>
  );
}
