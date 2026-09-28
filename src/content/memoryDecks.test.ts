import { describe, expect, it } from 'vitest';
import { MEMORY_DECKS } from './memoryDecks';

describe('memory decks', () => {
  it('MEMORY_DECKS_everyDeck_hasSixDistinctCardsWithNames', () => {
    // Arrange & Act
    const problems = MEMORY_DECKS.filter(
      (deck) => deck.cards.length !== 6 || new Set(deck.cards.map((c) => c.glyph)).size !== 6 || deck.cards.some((c) => c.name.trim() === ''),
    );

    // Assert
    expect(problems).toEqual([]);
  });
});
