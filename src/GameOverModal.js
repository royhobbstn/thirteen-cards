import * as React from 'react';
import { Modal, Button, Icon, Header, List } from 'semantic-ui-react';
import confetti from 'canvas-confetti';
import { getSeatIndex, isAiSeat } from './util.js';

const PLACEMENT_LABELS = ['1st', '2nd', '3rd', '4th'];

// Confetti celebration effect - returns cleanup function for interval
function fireConfetti(isWinner, prefersReducedMotion) {
  // Respect user's motion preferences
  if (prefersReducedMotion) {
    return () => {}; // No-op cleanup
  }

  const duration = isWinner ? 3000 : 1500;
  const end = Date.now() + duration;
  let intervalId = null;

  // Winner gets a big celebration
  if (isWinner) {
    // Initial burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ffd700', '#ffb800', '#ff6b6b', '#4ecdc4', '#45b7d1'],
    });

    // Continuous confetti from sides
    intervalId = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(intervalId);
        intervalId = null;
        return;
      }

      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ffd700', '#ffb800'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ffd700', '#ffb800'],
      });
    }, 50);
  } else {
    // Non-winners get a smaller celebration
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#4ecdc4', '#45b7d1', '#96ceb4'],
    });
  }

  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}

export function GameOverModal({ gameData, socketRef, sendMessage, onClose }) {
  const playerSeatIndex = getSeatIndex(gameData, socketRef);

  // Trigger confetti when modal opens with proper cleanup
  React.useEffect(() => {
    if (gameData?.stage !== 'done') {
      return;
    }

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Determine if player won (spectators/null seatIndex treated as non-winner)
    const playerRank = playerSeatIndex !== null ? gameData.rank[playerSeatIndex] : null;
    const isWinner = playerRank === 1;

    // Small delay to let modal animate in first
    let cleanupConfetti = () => {};
    const timeoutId = setTimeout(() => {
      cleanupConfetti = fireConfetti(isWinner, prefersReducedMotion);
    }, 300);

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
      cleanupConfetti();
    };
  }, [gameData?.stage, gameData?.rank, playerSeatIndex]);

  if (!gameData || gameData.stage !== 'done') {
    return null;
  }

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
