import * as React from 'react';

export function Stats({ gameData, socketRef }) {
  if (!gameData) {
    return null;
  }

  return <React.Fragment>{JSON.stringify(gameData.stats)}</React.Fragment>;
}
