import * as React from 'react';
import { ReactSortable } from 'react-sortablejs';
const { getDetectedCards } = require('./cardUtils/detectedCards');

export function CardSpace({ seatIndex, stage, cardObjects }) {
  const [listState, updateListState] = React.useState(cardObjects);
  const [scratchState, updateScratchState] = React.useState([]);

  if (seatIndex == null) {
    return null;
  }

  const detectedHand = getDetectedCards(scratchState);

  // if mismatch between listState and original
  if (cardObjects.length !== listState.length + scratchState.length) {
    updateListState(cardObjects);
    // scratchState should already be empty
  }

  function addCardToScratch(card) {
    updateScratchState([...scratchState, { id: card, name: card }]);
    updateListState([...listState.filter(d => d.id !== card)]);
  }

  function returnCardToMain(card) {
    updateListState([...listState, { id: card, name: card }]);
    updateScratchState([...scratchState.filter(d => d.id !== card)]);
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
        </div>
      ) : null}
    </div>
  );
}
