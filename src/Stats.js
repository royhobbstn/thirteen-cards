import * as React from 'react';
import { Table } from 'semantic-ui-react';
import { getInitials } from './util';

const MEDAL_STYLES = {
  0: { emoji: '🥇', bg: 'linear-gradient(135deg, #ffd700, #ffb800)', color: '#5d4600' },
  1: { emoji: '🥈', bg: 'linear-gradient(135deg, #c0c0c0, #a8a8a8)', color: '#3d3d3d' },
  2: { emoji: '🥉', bg: 'linear-gradient(135deg, #cd7f32, #b87333)', color: '#3d2400' },
};

function Avatar({ name, color }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        backgroundColor: color || 'var(--color-gray-400)',
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.75rem',
        marginRight: '8px',
        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </span>
  );
}

function MedalBadge({ rank }) {
  const style = MEDAL_STYLES[rank];
  if (!style) return null;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: style.bg,
        marginRight: '6px',
        fontSize: '0.85rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}
      title={`#${rank + 1}`}
    >
      {style.emoji}
    </span>
  );
}

export function Stats({ gameData, socketRef }) {
  if (!gameData) {
    return null;
  }

  if (!gameData.stats || Object.keys(gameData.stats).length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: 'var(--color-gray-500)',
        }}
      >
        <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No stats yet</p>
        <p style={{ fontSize: '0.9rem' }}>Play a game to see player statistics</p>
      </div>
    );
  }

  const statsRanks = Object.keys(gameData.stats).map(socketId => {
    const stat = gameData.stats[socketId];
    const points = stat.points || 0;
    const playerGames = stat.playerGames || 0;
    const first = stat.first || 0;
    const second = stat.second || 0;
    const third = stat.third || 0;
    const fourth = stat.fourth || 0;
    const games = stat.games || 0;
    const bombs = stat.bombs || 0;
    return {
      socketId,
      name: gameData.aliases?.[socketId] || 'Unknown',
      color: gameData.colors?.[socketId],
      score: ((points / (playerGames || 1)) * 4).toFixed(2),
      first,
      second,
      third,
      fourth,
      games,
      bombs,
    };
  });

  statsRanks.sort((a, b) => {
    return parseFloat(b.score) - parseFloat(a.score);
  });

  return (
    <Table celled className="stats-table">
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Name</Table.HeaderCell>
          <Table.HeaderCell style={{ textAlign: 'center' }}>Score</Table.HeaderCell>
          <Table.HeaderCell style={{ textAlign: 'center' }}>#</Table.HeaderCell>
          <Table.HeaderCell style={{ textAlign: 'center' }}>&#x2780;</Table.HeaderCell>
          <Table.HeaderCell style={{ textAlign: 'center' }}>&#x2781;</Table.HeaderCell>
          <Table.HeaderCell style={{ textAlign: 'center' }}>&#x2782;</Table.HeaderCell>
          <Table.HeaderCell style={{ textAlign: 'center' }}>&#x2783;</Table.HeaderCell>
          <Table.HeaderCell style={{ textAlign: 'center' }}>&#x1F4A3;</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {statsRanks.map((statRow, index) => {
          const isCurrentPlayer = socketRef?.current?.id === statRow.socketId;
          return (
            <Table.Row
              key={statRow.socketId}
              style={{
                backgroundColor: isCurrentPlayer ? 'rgba(33, 133, 208, 0.1)' : undefined,
              }}
            >
              <Table.Cell>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {index < 3 && <MedalBadge rank={index} />}
                  <Avatar name={statRow.name} color={statRow.color} />
                  <span style={{ fontWeight: isCurrentPlayer ? 600 : 400 }}>{statRow.name}</span>
                </div>
              </Table.Cell>
              <Table.Cell style={{ textAlign: 'center', fontWeight: 600 }}>
                {statRow.score}
              </Table.Cell>
              <Table.Cell style={{ textAlign: 'center' }}>{statRow.games}</Table.Cell>
              <Table.Cell style={{ textAlign: 'center' }}>{statRow.first}</Table.Cell>
              <Table.Cell style={{ textAlign: 'center' }}>{statRow.second}</Table.Cell>
              <Table.Cell style={{ textAlign: 'center' }}>{statRow.third}</Table.Cell>
              <Table.Cell style={{ textAlign: 'center' }}>{statRow.fourth}</Table.Cell>
              <Table.Cell style={{ textAlign: 'center' }}>{statRow.bombs}</Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
