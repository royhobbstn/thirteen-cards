import * as React from 'react';
import { ReactSortable } from 'react-sortablejs';
import { Button } from 'semantic-ui-react';
import { getDetectedCards } from './cardUtils/detectedCards';
import { restrictPlay, missingLowCard, isFreePlay } from './util.js';

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
    updateScratchState([]);
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
                detectedHand.rank === 0 ||
                !isYourTurn ||
                missingLowCard(gameData, scratchState) ||
                restrictPlay(gameData, seatIndex, detectedHand)
              }
              onClick={() => submitHand()}
            >
              Play
            </Button>
            <Button
              style={{ position: 'absolute', bottom: '5px', right: '5px', width: '100px' }}
              disabled={!isYourTurn || isFreePlay(gameData, seatIndex)}
              onClick={() => passTurn()}
            >
              Pass
            </Button>
          </div>
          {/* <p>{JSON.stringify(detectedHand)}</p>
          {!gameData.rank[seatIndex] ? (
            <div>
              {isYourTurn && missingLowCard(gameData, scratchState) ? (
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
