import * as React from 'react';
import { Modal, Button, Icon, Header, List } from 'semantic-ui-react';
import { getSeatIndex, isAiSeat } from './util.js';

const PLACEMENT_LABELS = ['1st', '2nd', '3rd', '4th'];

export function GameOverModal({ gameData, socketRef, sendMessage, onClose }) {
  if (!gameData || gameData.stage !== 'done') {
    return null;
  }

  const playerSeatIndex = getSeatIndex(gameData, socketRef);

  // Build placements array from rank data
  const placements = [];
  for (let i = 0; i < gameData.rank.length; i++) {
    const rank = gameData.rank[i];
    if (rank !== null) {
      const seatId = gameData.seated[i];
      const alias = gameData.aliases[seatId] || (isAiSeat(seatId) ? seatId.slice(2) : 'Unknown');
      const isPlayer = i === playerSeatIndex;
      const points = gameData.startingPlayers - rank + 1;
      placements.push({ rank, seatIndex: i, alias, isPlayer, points });
    }
  }

  // Sort by rank (1st place first)
  placements.sort((a, b) => a.rank - b.rank);

  const winner = placements[0];
  const playerPlacement = placements.find(p => p.isPlayer);

  // Guard against empty placements (shouldn't happen, but defensive)
  if (!winner) {
    return null;
  }

  const handlePlayAgain = () => {
    sendMessage('setGameStatus', 'seating');
    onClose();
  };

  return (
    <Modal open={true} size="small" className="game-over-modal">
      <Header className="game-over-header">
        <Icon name="trophy" className="trophy-icon" />
        Game Over!
      </Header>
      <Modal.Content>
        <div className="winner-announcement">
          <Icon name="star" className="winner-star" />
          <span className="winner-name">{winner.alias}</span>
          <span className="winner-label"> wins!</span>
        </div>

        <List divided relaxed className="placements-list">
          {placements.map(placement => (
            <List.Item
              key={placement.seatIndex}
              className={`placement-item ${placement.isPlayer ? 'is-player' : ''} ${placement.rank === 1 ? 'is-winner' : ''}`}
            >
              <List.Content className="placement-content">
                <span className="placement-rank">{PLACEMENT_LABELS[placement.rank - 1]}</span>
                <span className="placement-alias">{placement.alias}</span>
                <span className="placement-points">+{placement.points} pts</span>
              </List.Content>
            </List.Item>
          ))}
        </List>

        {playerPlacement && (
          <div className="personal-result">
            You finished in <strong>{PLACEMENT_LABELS[playerPlacement.rank - 1]}</strong> place!
          </div>
        )}
      </Modal.Content>
      <Modal.Actions>
        <Button basic onClick={onClose}>
          Close
        </Button>
        <Button primary onClick={handlePlayAgain}>
          <Icon name="redo" />
          Play Again
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
