import * as React from 'react';
import { Table } from 'semantic-ui-react';

export function Stats({ gameData, socketRef }) {
  if (!gameData) {
    return null;
  }

  const statsRanks = Object.keys(gameData.stats).map(socketId => {
    const points = gameData.stats[socketId].points;
    const playerGames = gameData.stats[socketId].playerGames;
    return {
      socketId,
      name: gameData.aliases[socketId],
      score: ((points / (playerGames || 1)) * 4).toFixed(2),
    };
  });

  statsRanks.sort((a, b) => {
    return b.score - a.score;
  });

  return (
    <Table celled>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Name</Table.HeaderCell>
          <Table.HeaderCell>Score</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {statsRanks.map(statRow => {
          return (
            <Table.Row key={statRow.socketId}>
              <Table.Cell>{statRow.name}</Table.Cell>
              <Table.Cell>{statRow.score}</Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
