import * as React from 'react';
import { Table } from 'semantic-ui-react';

export function Stats({ gameData, socketRef }) {
  if (!gameData) {
    return null;
  }

  const statsRanks = Object.keys(gameData.stats).map(socketId => {
    const points = gameData.stats[socketId].points;
    const playerGames = gameData.stats[socketId].playerGames;
    const first = gameData.stats[socketId].first;
    const second = gameData.stats[socketId].second;
    const third = gameData.stats[socketId].third;
    const fourth = gameData.stats[socketId].fourth;
    const games = gameData.stats[socketId].games;
    const bombs = gameData.stats[socketId].bombs;
    return {
      socketId,
      name: gameData.aliases[socketId],
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
    return b.score - a.score;
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
        {statsRanks.map(statRow => {
          return (
            <Table.Row key={statRow.socketId}>
              <Table.Cell>{statRow.name}</Table.Cell>
              <Table.Cell style={{ textAlign: 'center' }}>{statRow.score}</Table.Cell>
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
