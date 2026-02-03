import * as React from 'react';
import { Button, Icon, Label } from 'semantic-ui-react';
import { isAiSeat } from './util';

export function GameStageBoard({ gameData, sendMessage, socketRef, seatIndex, justPlayed }) {
  const seatId = gameData.seated[seatIndex];
  const isOccupied = seatId !== null;
  const isActiveTurn = isOccupied && seatIndex === gameData.turnIndex;
  const isSelf = seatId === socketRef.current.id;
  const isAi = isAiSeat(seatId);
  const turnClass = isActiveTurn ? (isSelf ? 'active-turn-self' : 'active-turn') : '';
  const justPlayedClass = justPlayed ? 'just-played' : '';
  const spotlightClass = isActiveTurn && isSelf ? 'seat-spotlight' : '';

  return (
    <div className={`${turnClass} ${justPlayedClass} ${spotlightClass}`.trim()}>
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
        <Button>
          <Icon name="android" size="big" color="blue" />
          <Label circular color="grey" size="mini" floating>
            {gameData.cards[seatIndex]?.length ?? 0}
          </Label>
        </Button>
      )}

      {/* Other human player */}
      {isOccupied && !isSelf && !isAi && (
        <Button>
          <Icon name="user" size="big" color="black" />
          <Label circular color="grey" size="mini" floating>
            {gameData.cards[seatIndex]?.length ?? 0}
          </Label>
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
