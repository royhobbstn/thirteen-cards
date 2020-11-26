import * as React from 'react';
import useGame from './useGame';

export function Game({ socketRef }) {
  const { gameData, sendMessage } = useGame(socketRef);

  if (!gameData) {
    console.log(sendMessage);
    return null;
  }

  // function showAll() {
  //   sendMessage('showAll', !gameData.showAll);
  // }

  return <div></div>;
}
