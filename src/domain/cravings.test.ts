import { describe, expect, it } from 'vitest';
import { cravingsBeaten, cravingsByTimeOfDay, slipTriggers, sosProgress, strengthTrend } from './cravings';
import type { CravingEvent, Slip } from './types';

const event = (outcome: CravingEvent['outcome']): CravingEvent => ({
  id: 1, startedAt: '2026-09-28T10:00:00.000Z', endedAt: '2026-09-28T10:04:00.000Z', outcome, activity: null, strengthStart: null, strengthEnd: null,
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

const rated = (startedAt: string, strengthStart: number | null): CravingEvent => ({
  id: 1, startedAt, endedAt: startedAt, outcome: 'passed', activity: null, strengthStart, strengthEnd: null,
});

describe('strengthTrend', () => {
  const NOW = new Date('2026-09-28T12:00:00.000Z');

  it('strengthTrend_ratingsInBothWindows_averagesEach', () => {
    // Arrange — earlier: 4, 5 → 4.5; last 14 days: 2, 3 → 2.5
    const events = [rated('2026-08-20T10:00:00.000Z', 4), rated('2026-08-25T10:00:00.000Z', 5), rated('2026-09-20T10:00:00.000Z', 2), rated('2026-09-27T10:00:00.000Z', 3)];

    // Act
    const trend = strengthTrend(events, NOW);

    // Assert
    expect(trend).toEqual({ recent: 2.5, earlier: 4.5 });
  });

  it('strengthTrend_unratedCravings_areIgnored', () => {
    // Arrange
    const events = [rated('2026-09-27T10:00:00.000Z', null), rated('2026-09-26T10:00:00.000Z', 3)];

    // Act
    const trend = strengthTrend(events, NOW);

    // Assert
    expect(trend).toEqual({ recent: 3, earlier: null });
  });

  it('strengthTrend_noRatings_isAllNull', () => {
    // Arrange & Act & Assert
    expect(strengthTrend([], NOW)).toEqual({ recent: null, earlier: null });
  });
});

describe('cravingsByTimeOfDay', () => {
  it('cravingsByTimeOfDay_boundaryHours_landInTheRightBucket', () => {
    // Arrange — the hour function stands in for the device time zone
    const hours = [0, 5, 6, 11, 12, 17, 18, 23];
    const events = hours.map((h, i) => rated(String(i), null));

    // Act
    const buckets = cravingsByTimeOfDay(events, (iso) => hours[Number(iso)] ?? 0);

    // Assert
    expect(buckets).toEqual({ night: 2, morning: 2, afternoon: 2, evening: 2 });
  });
});

describe('slipTriggers', () => {
  it('slipTriggers_mixed_countsMostFrequentFirstAndSkipsUnknown', () => {
    // Arrange
    const slip = (trigger: Slip['trigger']): Slip => ({ id: 1, occurredAt: '2026-09-01T00:00:00.000Z', unitCount: 1, trigger, note: null, product: null });
    const slips = [slip('stress'), slip('alcohol'), slip('stress'), slip(null)];

    // Act
    const counts = slipTriggers(slips);

    // Assert
    expect(counts).toEqual([{ trigger: 'stress', count: 2 }, { trigger: 'alcohol', count: 1 }]);
  });
});
