import * as React from 'react';
import { ReactSortable } from 'react-sortablejs';
import { Button } from 'semantic-ui-react';
import { getDetectedCards } from './cardUtils/detectedCards';

export function CardSpace({ seatIndex, stage, cardObjects, sendMessage, gameData }) {
  const [listState, updateListState] = React.useState(cardObjects);
  const [scratchState, updateScratchState] = React.useState([]);

  if (seatIndex == null) {
    return null;
  }

  const detectedHand = getDetectedCards(scratchState);

  const isYourTurn = seatIndex === gameData.turnIndex;

  // if mismatch between listState and original
  if (cardObjects.length !== listState.length + scratchState.length) {
    updateListState(cardObjects);
    updateScratchState([]);
  }

  function addCardToScratch(card) {
    updateScratchState([...scratchState, { id: card, name: card }]);
    updateListState([...listState.filter(d => d.id !== card)]);
  }

  function returnCardToMain(card) {
    updateListState([...listState, { id: card, name: card }]);
    updateScratchState([...scratchState.filter(d => d.id !== card)]);
  }

  function submitHand() {
    sendMessage('submitHand', scratchState);
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
          <div style={{ height: '100px', width: '780px', marginLeft: '10px', marginTop: '10px' }}>
            <ReactSortable list={listState} setList={updateListState}>
              {listState.map(card => {
                return (
                  <div
                    onDoubleClick={() => addCardToScratch(card.id)}
                    key={card.id}
                    className="box-shadow"
                    style={{
                      width: '56px',
                      height: '56px',
                      display: 'inline-block',
                      margin: '2px',
                    }}
                  >
                    <img
                      key={card.id}
                      className="box-shadow"
                      style={{ width: '56px', height: 'auto', display: 'inline-block' }}
                      alt={card.id}
                      src={`cards/${card.id}.svg`}
                    />
                  </div>
                );
              })}
            </ReactSortable>
          </div>
          <div style={{ height: '100px', width: '780px', marginLeft: '10px', marginTop: '10px' }}>
            <ReactSortable list={scratchState} setList={updateScratchState} animation="150">
              {scratchState.map(card => {
                return (
                  <div
                    onDoubleClick={() => returnCardToMain(card.id)}
                    key={card.id}
                    className="box-shadow"
                    style={{
                      width: '56px',
                      height: '56px',
                      display: 'inline-block',
                      margin: '2px',
                    }}
                  >
                    <img
                      key={card.id}
                      className="box-shadow"
                      style={{ width: '56px', height: 'auto', display: 'inline-block' }}
                      alt={card.id}
                      src={`cards/${card.id}.svg`}
                    />
                  </div>
                );
              })}
            </ReactSortable>
          </div>
          <p>{JSON.stringify(detectedHand)}</p>
          {!gameData.rank[seatIndex] ? (
            <div>
              <Button
                disabled={
                  detectedHand.rank === 0 || !isYourTurn || missingLowCard() || restrictPlay()
                }
                onClick={() => submitHand()}
              >
                Submit Hand
              </Button>
              <Button disabled={!isYourTurn || isFreePlay()} onClick={() => passTurn()}>
                Pass
              </Button>
              {isYourTurn && missingLowCard() ? (
                <p>
                  {`You must play the lowest card ( ${gameData.lowest} ) as part of your first hand.`}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
