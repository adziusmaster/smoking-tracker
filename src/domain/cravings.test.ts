import { describe, expect, it } from 'vitest';
import { cravingsBeaten, sosProgress } from './cravings';
import type { CravingEvent } from './types';

const event = (outcome: CravingEvent['outcome']): CravingEvent => ({
  id: 1, startedAt: '2026-09-28T10:00:00.000Z', endedAt: '2026-09-28T10:04:00.000Z', outcome, activity: null,
});

describe('cravings', () => {
  it('cravingsBeaten_mixedOutcomes_countsOnlyPassed', () => {
    // Arrange
    const events = [event('passed'), event('slipped'), event('passed')];

    // Act
    const count = cravingsBeaten(events);

    // Assert
    expect(count).toBe(2);
  });

  it('sosProgress_halfwayThroughFiveMinutes_isHalf', () => {
    // Arrange & Act
    const progress = sosProgress('2026-09-28T10:00:00.000Z', new Date('2026-09-28T10:02:30.000Z'));

    // Assert
    expect(progress).toBe(0.5);
  });

  it('sosProgress_outsideTheWindow_clampsToZeroAndOne', () => {
    // Arrange & Act
    const before = sosProgress('2026-09-28T10:00:00.000Z', new Date('2026-09-28T09:59:00.000Z'));
    const after = sosProgress('2026-09-28T10:00:00.000Z', new Date('2026-09-28T10:30:00.000Z'));

    // Assert
    expect(before).toBe(0);
    expect(after).toBe(1);
  });
});
