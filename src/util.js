export function getSeatIndex(gameData, socketRef) {
  let seatIndex = null;
  for (let i = 0; i < gameData.seated.length; i++) {
    if (gameData.seated[i] === socketRef.current.id) {
      seatIndex = i;
    }
  }
  return seatIndex;
}

export function getLastPlay(gameData, seatIndex) {
  let lastPlay = null;

  // find previous 3 players actions
  for (let i = 1; i <= 3; i++) {
    let currentIndex = seatIndex - i;
    if (currentIndex < 0) {
      currentIndex = currentIndex + 4;
    }
    if (gameData.last[currentIndex] !== null && gameData.last[currentIndex] !== 'pass') {
      lastPlay = gameData.last[currentIndex];
      break;
    }
  }

  if (!lastPlay) {
    return { name: 'Free Play', play: 'Free Play', rank: 0 };
  }

  return lastPlay;
}

export function isFreePlay(gameData, seatIndex) {
  const lastPlay = getLastPlay(gameData, seatIndex);
  return lastPlay.play === 'Free Play';
}

export function restrictPlay(gameData, seatIndex, detectedHand) {
  // enforce game rules here
  // false = okay to play
  // true = disable submit button

  const lastPlay = getLastPlay(gameData, seatIndex);

  if (lastPlay.play === 'Free Play') {
    return false;
  }

  // this section allows bombs to be played on anything
  // and straight flushes to be played on Straights or Flushes
  let playTypeValidation = false;
  if (detectedHand.play === lastPlay.play) {
    playTypeValidation = true;
  }
  if (detectedHand.play === 'Bomb') {
    playTypeValidation = true;
  }

  if (lastPlay.play === 'Straight' && detectedHand.play === 'Straight Flush') {
    playTypeValidation = true;
  }

  if (lastPlay.play === 'Flush' && detectedHand.play === 'Straight Flush') {
    playTypeValidation = true;
  }

  if (playTypeValidation && detectedHand.rank > lastPlay.rank) {
    return false;
  }

  return true;
}

export function missingLowCard(gameData, scratchState) {
  return gameData.initial && !scratchState.some(card => card.id === gameData.lowest);
}
