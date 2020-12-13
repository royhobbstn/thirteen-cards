import * as React from 'react';

export function Rules() {
  return (
    <div
      style={{
        paddingRight: '5px',
        overflowY: 'scroll',
        borderRadius: '5px',
        height: '70vh',
        backgroundColor: 'white',
      }}
    >
      <h3>Rules</h3>
      <h4>Number of Players</h4>
      <p>This game can be play with 2, 3, or 4 players.</p>
      <h4>Card Rank</h4>
      <p>
        The cards are ranked beginning with 2 (highest), with A, K, Q etc in traditional rank all
        the way down to 3 (lowest)
      </p>
      <p>The suits are ranked in order Spades (highest), Hearts, Diamonds, Clubs (lowest).</p>
      <p>
        Card face is primary, while card suit is a tiebreaker. For instance, if someone where to
        play a single Ad, that could be beaten by any 2, but also by the Ah or As.
      </p>
      <h4>Starting</h4>
      <p>
        Each player is dealt 13 cards. The player who holds the 3c begins. If there is no 3c (in the
        case of playing with 2 or 3 players), the person with the lowest ranking card begins first.
        The lowest ranking card does not need to be played by itself, it can be played as a part of
        any valid hand (see below).
      </p>
      <h4>Turns</h4>
      <p>
        Order goes clockwise. Each player plays a valid hand, or chooses to pass. A player is not
        compelled to play a higher hand, they may pass for any reason.
      </p>
      <p>
        If all players have passed to a played hand, the player of the winning hand has gained
        control of the board, and is entitled to "Free Play". They are allowed to lead with
        whichever valid hand they would like to play.
      </p>
      <h4>Winning</h4>
      <p>
        A player has won once they have played all 13 of their cards. The remaining players play for
        2nd, 3rd, or 4th place if applicable.
      </p>
      <h4>Valid Hands</h4>
      <p>
        An inventory of valid hands is below. With the exceptions of a Bomb or a Straight Flush, a
        player may only play a valid hand in the same category as the previous hand that was played
        (unless they are in Free Play, in which case they can lead with whichever hand they choose).
        Hands within the same category are ranked by their highest card (with exceptions called out
        below). There isn't necessarily a hierarchy of play categories, as you can't play different
        categories in the same round of play. (Bombs and Straight Flushes being an exception)
      </p>
      <h5>Singles</h5>
      <p>A single card.</p>
      <h5>One Pair</h5>
      <p>
        Two cards with the same card face. An example would be Jd, Jc. A pair of Ts, Tc will be a
        pair of Th, Td because hands within the same play category are ranked by their highest card.
      </p>
      <h5>Two Pair</h5>
      <p>
        An example would be Th Td 5s 5c. Recall, as with most other hands, two pair are ranked by
        their highest card.
      </p>
      <h5>Three of a Kind</h5>
      <p>Three cards with the same card face. An example would be 4s 4h 4c.</p>
      <h5>Straights</h5>
      <p>
        Straights can range from 3 consecutive cards all the way up to 13 consecutive cards. The
        play category of a straight depends on the number of cards in the straight. For example, you
        cannot play a 4 card straight in response to a 3 card straight. Straights cannot
        wrap-around. For example, while a straight of 2s Ah Kd Qd would be a valid straight, 3d 2s
        Ah Kc would not be valid.
      </p>
      <h5>Full House</h5>
      <p>
        A hand with a 3-of-a-kind and a pair. Ranked by the highest card in the three-of-a-kind.
      </p>
      <h5>Flush</h5>
      <p>
        5 cards (only) of the same suit. Ranked by highest individual card. A spade flush is not
        necessarily higher ranked than a club flush.
      </p>
      <h5>Straight Flush</h5>
      <p>
        5 consecutive cards (only) with the same suit. Straight Flushes (like bombs) change the play
        category, and can be played on existing 5 card straights or flushes (or other straight
        flushes) if they can beat the individual high card rank on the former category. Successive
        players would then have to have a higher Straight Flush to win control of the board.
      </p>
      <h4>Bombs</h4>
      <p>
        There are two varieties of bombs; 3-consecutive pair bombs, and 4 of a kind bombs. Bombs can
        be played in turn on any play category, and in turn change the play category to "Bomb".
      </p>
      <h5>Three Consecutive Pairs</h5>
      <p>
        An example would be 4c 4h 5c 5s 6c 6h. Can only be beated by a higher 3-consecutive-pair
        bomb, or a 4-of-a-kind bomb.
      </p>
      <h5>Four of a Kind</h5>
      <p>An example would be 7s 7h 7d 7c. Can only be beated by a higher 4-of-a-kind bomb.</p>
    </div>
  );
}
