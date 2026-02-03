import * as React from 'react';
import { Accordion, Icon } from 'semantic-ui-react';

const rulesContent = [
  {
    key: 'players',
    title: 'Number of Players',
    content: (
      <p>This game can be played with 2, 3, or 4 players.</p>
    ),
  },
  {
    key: 'rank',
    title: 'Card Rank',
    content: (
      <>
        <p>
          The cards are ranked beginning with 2 (highest), with A, K, Q etc in traditional rank all
          the way down to 3 (lowest).
        </p>
        <p>The suits are ranked in order: Spades (highest), Hearts, Diamonds, Clubs (lowest).</p>
        <p>
          Card face is primary, while card suit is a tiebreaker. For instance, if someone were to
          play a single A♦, that could be beaten by any 2, but also by the A♥ or A♠.
        </p>
      </>
    ),
  },
  {
    key: 'starting',
    title: 'Starting',
    content: (
      <p>
        Each player is dealt 13 cards. The player who holds the 3♣ begins. If there is no 3♣ (in the
        case of playing with 2 or 3 players), the person with the lowest ranking card begins first.
        The lowest ranking card does not need to be played by itself, it can be played as a part of
        any valid hand (see below).
      </p>
    ),
  },
  {
    key: 'turns',
    title: 'Turns',
    content: (
      <>
        <p>
          Order goes clockwise. Each player plays a valid hand, or chooses to pass. A player is not
          compelled to play a higher hand, they may pass for any reason.
        </p>
        <p>
          If all players have passed to a played hand, the player of the winning hand has gained
          control of the board, and is entitled to "Free Play". They are allowed to lead with
          whichever valid hand they would like to play.
        </p>
      </>
    ),
  },
  {
    key: 'winning',
    title: 'Winning',
    content: (
      <p>
        A player has won once they have played all 13 of their cards. The remaining players play for
        2nd, 3rd, or 4th place if applicable.
      </p>
    ),
  },
  {
    key: 'hands',
    title: 'Valid Hands',
    content: (
      <>
        <p>
          An inventory of valid hands is below. With the exceptions of a Bomb or a Straight Flush, a
          player may only play a valid hand in the same category as the previous hand that was played
          (unless they are in Free Play, in which case they can lead with whichever hand they choose).
          Hands within the same category are ranked by their highest card (with exceptions called out
          below).
        </p>

        <Accordion.Accordion
          defaultActiveIndex={[0]}
          panels={[
            {
              key: 'singles',
              title: { content: <strong>Singles</strong>, icon: 'dropdown' },
              content: { content: <p>A single card.</p> },
            },
            {
              key: 'pair',
              title: { content: <strong>One Pair</strong>, icon: 'dropdown' },
              content: {
                content: (
                  <p>
                    Two cards with the same card face. An example would be J♦, J♣. A pair of T♠, T♣ will
                    beat a pair of T♥, T♦ because hands within the same play category are ranked by
                    their highest card.
                  </p>
                ),
              },
            },
            {
              key: 'twopair',
              title: { content: <strong>Two Pair</strong>, icon: 'dropdown' },
              content: {
                content: (
                  <p>
                    An example would be T♥ T♦ 5♠ 5♣. Recall, as with most other hands, two pair are
                    ranked by their highest card.
                  </p>
                ),
              },
            },
            {
              key: 'three',
              title: { content: <strong>Three of a Kind</strong>, icon: 'dropdown' },
              content: {
                content: <p>Three cards with the same card face. An example would be 4♠ 4♥ 4♣.</p>,
              },
            },
            {
              key: 'straights',
              title: { content: <strong>Straights</strong>, icon: 'dropdown' },
              content: {
                content: (
                  <p>
                    Straights can range from 3 consecutive cards all the way up to 13 consecutive cards.
                    The play category of a straight depends on the number of cards in the straight. For
                    example, you cannot play a 4 card straight in response to a 3 card straight. Straights
                    cannot wrap-around. For example, while a straight of 2♠ A♥ K♦ Q♦ would be a valid
                    straight, 3♦ 2♠ A♥ K♣ would not be valid.
                  </p>
                ),
              },
            },
            {
              key: 'fullhouse',
              title: { content: <strong>Full House</strong>, icon: 'dropdown' },
              content: {
                content: (
                  <p>A hand with a 3-of-a-kind and a pair. Ranked by the highest card in the three-of-a-kind.</p>
                ),
              },
            },
            {
              key: 'flush',
              title: { content: <strong>Flush</strong>, icon: 'dropdown' },
              content: {
                content: (
                  <p>
                    5 cards (only) of the same suit. Ranked by highest individual card. A spade flush is
                    not necessarily higher ranked than a club flush.
                  </p>
                ),
              },
            },
            {
              key: 'straightflush',
              title: { content: <strong>Straight Flush</strong>, icon: 'dropdown' },
              content: {
                content: (
                  <p>
                    5 consecutive cards (only) with the same suit. Straight Flushes (like bombs) change
                    the play category, and can be played on existing 5 card straights or flushes (or other
                    straight flushes) if they can beat the individual high card rank on the former category.
                    Successive players would then have to have a higher Straight Flush to win control of
                    the board.
                  </p>
                ),
              },
            },
          ]}
          exclusive={false}
        />
      </>
    ),
  },
  {
    key: 'bombs',
    title: 'Bombs',
    content: (
      <>
        <p>
          There are two varieties of bombs; 3-consecutive pair bombs, and 4 of a kind bombs. Bombs can
          be played in turn on any play category, and in turn change the play category to "Bomb".
        </p>

        <Accordion.Accordion
          panels={[
            {
              key: 'threepair',
              title: { content: <strong>Three Consecutive Pairs</strong>, icon: 'dropdown' },
              content: {
                content: (
                  <p>
                    An example would be 4♣ 4♥ 5♣ 5♠ 6♣ 6♥. Can only be beaten by a higher 3-consecutive-pair
                    bomb, or a 4-of-a-kind bomb.
                  </p>
                ),
              },
            },
            {
              key: 'fourkind',
              title: { content: <strong>Four of a Kind</strong>, icon: 'dropdown' },
              content: {
                content: <p>An example would be 7♠ 7♥ 7♦ 7♣. Can only be beaten by a higher 4-of-a-kind bomb.</p>,
              },
            },
          ]}
          exclusive={false}
        />
      </>
    ),
  },
];

export function Rules() {
  const [activeIndexes, setActiveIndexes] = React.useState([0]); // First section open by default

  const handleClick = (e, { index }) => {
    setActiveIndexes(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <div
      style={{
        paddingRight: '5px',
        overflowY: 'auto',
        borderRadius: '5px',
        height: '70vh',
        backgroundColor: 'var(--surface-card)',
        color: 'var(--color-gray-800)',
      }}
    >
      <h3 style={{ padding: '10px 10px 0', margin: 0 }}>Rules</h3>
      <Accordion fluid styled style={{ marginTop: '10px' }}>
        {rulesContent.map((section, index) => (
          <React.Fragment key={section.key}>
            <Accordion.Title
              active={activeIndexes.includes(index)}
              index={index}
              onClick={handleClick}
            >
              <Icon name="dropdown" />
              {section.title}
            </Accordion.Title>
            <Accordion.Content active={activeIndexes.includes(index)}>
              {section.content}
            </Accordion.Content>
          </React.Fragment>
        ))}
      </Accordion>
    </div>
  );
}
