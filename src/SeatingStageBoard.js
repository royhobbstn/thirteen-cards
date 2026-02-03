import * as React from 'react';
import { Button, Icon, Dropdown, Popup } from 'semantic-ui-react';
import { isAiSeat, AI_PERSONAS, AI_DISPLAY_NAMES, AI_PERSONA_DESCRIPTIONS } from './util';

export function SeatingStageBoard({ gameData, sendMessage, socketRef, seatIndex }) {
  const seatId = gameData.seated[seatIndex];
  const isAi = isAiSeat(seatId);
  const isMe = seatId === socketRef.current.id;
  const isEmpty = seatId === null;
  const isOtherPlayer = !isEmpty && !isAi && !isMe;

  // Get AI persona info for tooltip
  const aiPersona = isAi ? seatId.slice(2) : null;
  const aiDisplayName = aiPersona && AI_DISPLAY_NAMES[aiPersona] ? AI_DISPLAY_NAMES[aiPersona] : 'AI Player';
  const aiDescription = aiPersona && AI_PERSONA_DESCRIPTIONS[aiPersona] ? AI_PERSONA_DESCRIPTIONS[aiPersona] : 'Computer-controlled player';

  const aiOptions = AI_PERSONAS.map(persona => ({
    key: persona,
    text: AI_DISPLAY_NAMES[persona],
    value: persona,
  }));

  return (
    <React.Fragment>
      {/* Empty seat - show Sit button and AI dropdown */}
      {isEmpty && (
        <Button.Group>
          <Button animated="fade" onClick={() => sendMessage('chooseSeat', seatIndex)}>
            <Button.Content hidden>Sit</Button.Content>
            <Button.Content visible>
              <Icon name="user outline" size="big" color="grey" />
            </Button.Content>
          </Button>
          <Dropdown
            button
            className="icon"
            floating
            trigger={<Icon name="android" color="blue" />}
            options={aiOptions}
            onChange={(e, { value }) => sendMessage('addAi', { seatIndex, persona: value })}
          />
        </Button.Group>
      )}

      {/* AI seated - show robot icon with remove option and tooltip */}
      {isAi && (
        <Popup
          trigger={
            <Button animated="fade" onClick={() => sendMessage('removeAi', { seatIndex })}>
              <Button.Content hidden>Remove</Button.Content>
              <Button.Content visible>
                <Icon name="android" size="big" color="blue" />
              </Button.Content>
            </Button>
          }
          content={aiDescription}
          header={aiDisplayName}
          position="top center"
          size="small"
          inverted
          mouseEnterDelay={300}
          mouseLeaveDelay={150}
        />
      )}

      {/* Other player seated - show disabled user icon */}
      {isOtherPlayer && (
        <Button disabled>
          <Button.Content>
            <Icon name="user" size="big" color="black" />
          </Button.Content>
        </Button>
      )}

      {/* Me seated - show Stand Up button */}
      {isMe && (
        <Button animated="fade" onClick={() => sendMessage('chooseSeat', seatIndex)}>
          <Button.Content hidden>Stand Up</Button.Content>
          <Button.Content visible>
            <Icon name="user" size="big" color="green" />
          </Button.Content>
        </Button>
      )}
    </React.Fragment>
  );
}
