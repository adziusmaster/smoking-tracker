import { describe, expect, it } from 'vitest';
import { deckIndexForRound, flip, hideUnmatched, isWon, needsHide, newMemory, type MemoryState } from './memory';

/** Indexes of the two cards showing `symbol`. */
const pairOf = (s: MemoryState, symbol: number) =>
  s.cards.flatMap((card, index) => (card.symbol === symbol ? [index] : []));

describe('memory', () => {
  it('newMemory_sixPairs_hasEverySymbolExactlyTwiceFaceDown', () => {
    // Arrange & Act
    const s = newMemory(9);
    const counts = new Map<number, number>();
    s.cards.forEach((c) => counts.set(c.symbol, (counts.get(c.symbol) ?? 0) + 1));

    // Assert
    expect(s.cards).toHaveLength(12);
    expect([...counts.values()].every((n) => n === 2)).toBe(true);
    expect(s.cards.some((c) => c.faceUp)).toBe(false);
  });

  it('flip_matchingPair_staysUpAsMatched', () => {
    // Arrange
    const s = newMemory(9);
    const [a, b] = pairOf(s, 0) as [number, number];

    // Act
    const after = flip(flip(s, a), b);

    // Assert
    expect(after.cards[a]?.matched).toBe(true);
    expect(after.cards[b]?.matched).toBe(true);
    expect(needsHide(after)).toBe(false);
    expect(after.moves).toBe(1);
  });

  it('flip_mismatchThenHide_turnsBothFaceDown', () => {
    // Arrange
    const s = newMemory(9);
    const [a] = pairOf(s, 0) as [number];
    const [c] = pairOf(s, 1) as [number];

    // Act
    const shown = flip(flip(s, a), c);
    const hidden = hideUnmatched(shown);

    // Assert
    expect(needsHide(shown)).toBe(true);
    expect(hidden.cards[a]?.faceUp).toBe(false);
    expect(hidden.cards[c]?.faceUp).toBe(false);
  });

  it('flip_thirdCardWhileMismatchShowing_isIgnored', () => {
    // Arrange
    const s = newMemory(9);
    const [a] = pairOf(s, 0) as [number];
    const [c] = pairOf(s, 1) as [number];
    const [d] = pairOf(s, 2) as [number];
    const shown = flip(flip(s, a), c);

    // Act
    const after = flip(shown, d);

    // Assert
    expect(after).toBe(shown);
  });

  it('isWon_allPairsMatched_isTrue', () => {
    // Arrange
    let s = newMemory(4, 3);

    // Act
    for (let symbol = 0; symbol < 3; symbol += 1) {
      const [a, b] = pairOf(s, symbol) as [number, number];
      s = flip(flip(s, a), b);
    }

    // Assert
    expect(isWon(s)).toBe(true);
  });
});

describe('deckIndexForRound', () => {
  it('deckIndexForRound_consecutiveRounds_cyclesThroughEveryDeck', () => {
    // Arrange & Act
    const indexes = [0, 1, 2, 3, 4, 5].map((round) => deckIndexForRound(round, 5));

    // Assert
    expect(indexes).toEqual([0, 1, 2, 3, 4, 0]);
  });

  it('deckIndexForRound_negativeRound_staysInRange', () => {
    // Arrange & Act
    const index = deckIndexForRound(-3, 5);

    // Assert
    expect(index).toBe(2);
  });

  it('deckIndexForRound_noDecks_returnsZero', () => {
    // Arrange & Act
    const index = deckIndexForRound(7, 0);

    // Assert
    expect(index).toBe(0);
  });
});
