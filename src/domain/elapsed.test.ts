import { describe, expect, it } from 'vitest';
import { elapsedBetween, elapsedSince } from './elapsed';

describe('elapsedSince', () => {
  it('elapsedSince_fortyThreeDaysAndSixHours_returnsBrokenDownDuration', () => {
    // Arrange
    const anchor = '2026-06-26T08:00:00+02:00';
    const now = new Date('2026-08-08T14:30:00+02:00');

    // Act
    const result = elapsedSince(anchor, now);

    // Assert
    expect(result.days).toBe(43);
    expect(result.hours).toBe(6);
    expect(result.minutes).toBe(30);
  });

  it('elapsedSince_anchorInTheFuture_returnsAllZeros', () => {
    // Arrange
    const anchor = '2026-09-01T00:00:00Z';
    const now = new Date('2026-08-08T00:00:00Z');

    // Act
    const result = elapsedSince(anchor, now);

    // Assert
    expect(result).toEqual({ totalMs: 0, days: 0, hours: 0, minutes: 0 });
  });

  it('elapsedSince_spanningDstTransition_countsWallClockDaysCorrectly', () => {
    // Arrange — Europe/Amsterdam moved to CEST on 29 March 2026
    const anchor = '2026-03-28T12:00:00+01:00';
    const now = new Date('2026-03-30T12:00:00+02:00');

    // Act
    const result = elapsedSince(anchor, now);

    // Assert — 47 absolute hours, so 1 day and 23 hours
    expect(result.days).toBe(1);
    expect(result.hours).toBe(23);
  });
});

describe('elapsedBetween', () => {
  it('elapsedBetween_twoClosedTimestamps_returnsTheirBrokenDownDistance', () => {
    // Arrange
    const start = '2026-06-26T08:00:00+02:00';
    const end = '2026-07-10T11:45:00+02:00';

    // Act
    const result = elapsedBetween(start, end);

    // Assert
    expect(result.days).toBe(14);
    expect(result.hours).toBe(3);
    expect(result.minutes).toBe(45);
  });

  it('elapsedBetween_endBeforeStart_returnsAllZeros', () => {
    // Arrange
    const start = '2026-07-10T00:00:00Z';
    const end = '2026-06-26T00:00:00Z';

    // Act
    const result = elapsedBetween(start, end);

    // Assert
    expect(result).toEqual({ totalMs: 0, days: 0, hours: 0, minutes: 0 });
  });
});
