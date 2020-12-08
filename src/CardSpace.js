import * as React from 'react';
import { ReactSortable } from 'react-sortablejs';
import { Button } from 'semantic-ui-react';
import { getDetectedCards } from './cardUtils/detectedCards';

let lastGameId = 0;

export function CardSpace({
  seatIndex,
  stage,
  cardObjects,
  sendMessage,
  gameData,
  windowDimensions,
}) {
  const [listState, updateListState] = React.useState(cardObjects);
  const [scratchState, updateScratchState] = React.useState([]);

  if (seatIndex == null) {
    return null;
  }

  // pane for table about 62.5% of total width
  const boardWidth = windowDimensions.width * 0.62 - 10;
  const numberOfCards = listState.length;
  const stagedNumberOfCards = scratchState.length;

  const cardAreaWidth = boardWidth - 148;
  let cardWidth = cardAreaWidth / (numberOfCards + 1);
  if (cardWidth > 64) {
    cardWidth = 64;
  }

  // extra space for submit / pass buttons
  const useableBoardWidth = boardWidth - 208;
  let stagedCardWidth = useableBoardWidth / (stagedNumberOfCards + 1);
  if (stagedCardWidth > 64) {
    stagedCardWidth = 64;
  }

  const detectedHand = getDetectedCards(scratchState);

  const isYourTurn = seatIndex === gameData.turnIndex;

  // if mismatch between listState and original
  if (gameData.gameId !== lastGameId) {
    console.log('HARD RESET');
    updateListState(cardObjects);
    lastGameId = gameData.gameId;
  }

  function addCardToScratch(card) {
    console.log('addCardToScratch');
    updateScratchState([...scratchState, { id: card, name: card }]);
    updateListState([...listState.filter(d => d.id !== card)]);
  }

  function returnCardToMain(card) {
    console.log('returnCardToMain');
    updateListState([...listState, { id: card, name: card }]);
    updateScratchState([...scratchState.filter(d => d.id !== card)]);
  }

  function submitHand() {
    sendMessage('submitHand', scratchState);
    updateScratchState([]);
  }

  function passTurn() {
    sendMessage('passTurn');
  }

  function missingLowCard() {
    return gameData.initial && !scratchState.some(card => card.id === gameData.lowest);
  }

  function isFreePlay() {
    const lastPlay = getLastPlay();
    console.log(lastPlay);
    return lastPlay.play === 'Free Play';
  }

  function getLastPlay() {
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

  function restrictPlay() {
    // enforce game rules here
    // false = okay to play
    // true = disable submit button

    const lastPlay = getLastPlay();

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

  return (
    <div>
      {seatIndex !== null && stage !== 'seating' ? (
        <div>
          <div
            style={{
              height: '100px',
              width: boardWidth + 'px',
              marginLeft: '10px',
              marginTop: '10px',
            }}
          >
            <ReactSortable
              className="dropzone"
              group={{ name: 'mainlist', put: true, pull: ['scratchlist'] }}
              list={listState}
              setList={updateListState}
              style={{ width: '100%', height: '100%' }}
            >
              {listState.map(card => {
                return (
                  <div
                    onDoubleClick={() => addCardToScratch(card.id)}
                    key={card.id}
                    style={{
                      width: cardWidth + 'px',
                      height: 'auto',
                      display: 'inline-block',
                      margin: '2px',
                    }}
                  >
                    <img
                      className="box-shadow"
                      key={card.id}
                      style={{
                        width: '64px',
                        height: 'auto',
                        display: 'inline-block',
                      }}
                      alt={card.id}
                      src={`cards/${card.id}.svg`}
                    />
                  </div>
                );
              })}
            </ReactSortable>
          </div>
          <div
            style={{
              height: '100px',
              width: boardWidth + 'px',
              marginLeft: '10px',
              marginTop: '10px',
              position: 'relative',
            }}
          >
            <ReactSortable
              className="dropzone"
              group={{ name: 'scratchlist', put: true, pull: ['mainlist'] }}
              list={scratchState}
              setList={updateScratchState}
              animation="150"
              style={{
                width: '100%',
                height: '100px',
                position: 'absolute',
                top: '0',
                left: '0',
              }}
            >
              {scratchState.map(card => {
                return (
                  <div
                    onDoubleClick={() => returnCardToMain(card.id)}
                    key={card.id}
                    style={{
                      width: stagedCardWidth + 'px',
                      height: 'auto',
                      display: 'inline-block',
                      margin: '2px',
                    }}
                  >
                    <img
                      className="box-shadow"
                      key={card.id}
                      style={{
                        width: '64px',
                        height: 'auto',
                        display: 'inline-block',
                      }}
                      alt={card.id}
                      src={`cards/${card.id}.svg`}
                    />
                  </div>
                );
              })}
            </ReactSortable>
            <Button
              style={{ position: 'absolute', top: '5px', right: '5px', width: '100px' }}
              disabled={
                detectedHand.rank === 0 || !isYourTurn || missingLowCard() || restrictPlay()
              }
              onClick={() => submitHand()}
            >
              Play
            </Button>
            <Button
              style={{ position: 'absolute', bottom: '5px', right: '5px', width: '100px' }}
              disabled={!isYourTurn || isFreePlay()}
              onClick={() => passTurn()}
            >
              Pass
            </Button>
          </div>
          {/* <p>{JSON.stringify(detectedHand)}</p>
          {!gameData.rank[seatIndex] ? (
            <div>
              {isYourTurn && missingLowCard() ? (
                <p>
                  {`You must play the lowest card ( ${gameData.lowest} ) as part of your first hand.`}
                </p>
              ) : null}
            </div>
          ) : null} */}
        </div>
      ) : null}
    </div>
  );
}
