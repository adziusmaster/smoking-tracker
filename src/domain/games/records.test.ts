import { describe, expect, it } from 'vitest';
import { beatsPreviousBest, isNewBest } from './records';

describe('isNewBest', () => {
  it('isNewBest_noRecordYet_isTrueForAnyFinishedGame', () => {
    // Arrange & Act & Assert
    expect(isNewBest('memory', 14, null)).toBe(true);
  });

  it('isNewBest_higherIsBetterGames_needAStrictlyHigherValue', () => {
    // Arrange & Act & Assert
    expect(isNewBest('blocks', 1200, 1100)).toBe(true);
    expect(isNewBest('bubbles', 30, 30)).toBe(false);
  });

  it('isNewBest_memory_needsFewerMoves', () => {
    // Arrange & Act & Assert
    expect(isNewBest('memory', 9, 10)).toBe(true);
    expect(isNewBest('memory', 11, 10)).toBe(false);
  });

  it('isNewBest_zeroScore_isNeverARecordForHigherGames', () => {
    // Arrange & Act & Assert — "0 popped" should not greet anyone with "New best!"
    expect(isNewBest('bubbles', 0, null)).toBe(false);
  });
});

describe('beatsPreviousBest', () => {
  it('beatsPreviousBest_betterThanStored_isTrue', () => {
    // Arrange & Act
    const result = beatsPreviousBest('bubbles', 31, 30);

    // Assert
    expect(result).toBe(true);
  });

  it('beatsPreviousBest_noRecordYet_isFalseSoTheFirstPopIsNotANewBest', () => {
    // Arrange & Act
    const result = beatsPreviousBest('bubbles', 1, null);

    // Assert
    expect(result).toBe(false);
  });

  it('beatsPreviousBest_memoryTie_isFalse', () => {
    // Arrange & Act
    const result = beatsPreviousBest('memory', 9, 9);

    // Assert
    expect(result).toBe(false);
  });
});
