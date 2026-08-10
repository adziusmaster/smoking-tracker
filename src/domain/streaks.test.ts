import { describe, expect, it } from 'vitest';
import { longestSmokeFreeStreak, smokeFreeStreaks } from './streaks';
import { MS_PER_DAY, type QuitState, type SmokingPeriod } from './types';

const QUIT = '2026-01-01T00:00:00.000Z';

const state = (periods: SmokingPeriod[] = []): QuitState => ({
  settings: {
    quitDate: QUIT,
    cigarettesPerDay: 15,
    cigarettesPerPack: 20,
    packPriceMinor: 1100,
    currency: 'EUR',
    timezone: 'Europe/Amsterdam',
    smokedForMonths: 0,
  },
  slips: [],
  periods,
});

const period = (startedAt: string, endedAt: string | null): SmokingPeriod => ({
  id: 1,
  startedAt,
  endedAt,
  averageCigarettesPerDay: 20,
  note: null,
});

describe('longestSmokeFreeStreak', () => {
  it('longestSmokeFreeStreak_noPeriods_measuresTheRunFromQuitDateToNow', () => {
    // Arrange
    const now = new Date('2026-01-31T00:00:00.000Z');

    // Act
    const result = longestSmokeFreeStreak(state(), now);

    // Assert
    expect(result.elapsed.days).toBe(30);
    expect(result.startedAt).toBe(QUIT);
    expect(result.isCurrent).toBe(true);
  });

  it('longestSmokeFreeStreak_oneCompletedPeriod_prefersTheLongerOfTheTwoRuns', () => {
    // Arrange — 10 clean days before the relapse, only 5 since it ended
    const periods = [period('2026-01-11T00:00:00.000Z', '2026-01-21T00:00:00.000Z')];
    const now = new Date('2026-01-26T00:00:00.000Z');

    // Act
    const result = longestSmokeFreeStreak(state(periods), now);

    // Assert
    expect(result.elapsed.days).toBe(10);
    expect(result.startedAt).toBe(QUIT);
    expect(result.isCurrent).toBe(false);
  });

  it('longestSmokeFreeStreak_twoCompletedPeriodsWithTheEarliestRunLongest_returnsThatEarliestRun', () => {
    // Arrange — runs are 31 days (Jan 1 → Feb 1), 15 days (Feb 5 → Feb 20), 7 days (Feb 22 → Mar 1)
    const periods = [
      period('2026-02-01T00:00:00.000Z', '2026-02-05T00:00:00.000Z'),
      period('2026-02-20T00:00:00.000Z', '2026-02-22T00:00:00.000Z'),
    ];
    const now = new Date('2026-03-01T00:00:00.000Z');

    // Act
    const result = longestSmokeFreeStreak(state(periods), now);

    // Assert — returning the most recent run instead would give 7 days
    expect(result.elapsed.days).toBe(31);
    expect(result.startedAt).toBe(QUIT);
    expect(result.endedAt).toBe('2026-02-01T00:00:00.000Z');
  });

  it('longestSmokeFreeStreak_periodsOrderedNewestFirst_stillMeasuresChronologically', () => {
    // Arrange — the repository returns rows newest-first, so the same facts in that order
    const periods = [
      period('2026-02-20T00:00:00.000Z', '2026-02-22T00:00:00.000Z'),
      period('2026-02-01T00:00:00.000Z', '2026-02-05T00:00:00.000Z'),
    ];
    const now = new Date('2026-03-01T00:00:00.000Z');

    // Act
    const result = longestSmokeFreeStreak(state(periods), now);

    // Assert
    expect(result.elapsed.days).toBe(31);
    expect(result.endedAt).toBe('2026-02-01T00:00:00.000Z');
  });

  it('longestSmokeFreeStreak_openPeriod_doesNotGrowAsNowAdvances', () => {
    // Arrange — still smoking since Feb 1, so the best run is frozen at 31 days
    const periods = [period('2026-02-01T00:00:00.000Z', null)];

    // Act
    const soon = longestSmokeFreeStreak(state(periods), new Date('2026-02-02T00:00:00.000Z'));
    const muchLater = longestSmokeFreeStreak(state(periods), new Date('2026-06-01T00:00:00.000Z'));

    // Assert
    expect(soon.elapsed.totalMs).toBe(31 * MS_PER_DAY);
    expect(muchLater.elapsed.totalMs).toBe(soon.elapsed.totalMs);
    expect(muchLater.isCurrent).toBe(false);
  });

  it('longestSmokeFreeStreak_periodStartingBeforeItEnded_clampsThatRunToZeroRatherThanGoingNegative', () => {
    // Arrange — a period that starts before the quit date (a corrected clock or a backdated
    // entry) opens and closes before any smoke-free run exists
    const periods = [period('2025-12-25T00:00:00.000Z', '2026-01-06T00:00:00.000Z')];
    const now = new Date('2026-01-16T00:00:00.000Z');

    // Act
    const result = longestSmokeFreeStreak(state(periods), now);
    const runs = smokeFreeStreaks(state(periods), now);

    // Assert — the inverted run reads as zero, and the real run is the 10 days since it ended
    expect(runs[0]?.elapsed.totalMs).toBe(0);
    expect(result.elapsed.days).toBe(10);
    expect(result.startedAt).toBe('2026-01-06T00:00:00.000Z');
  });
});

describe('smokeFreeStreaks', () => {
  it('smokeFreeStreaks_openPeriod_endsTheLastRunAtThePeriodStartWithNoRunInProgress', () => {
    // Arrange
    const periods = [period('2026-02-01T00:00:00.000Z', null)];
    const now = new Date('2026-03-01T00:00:00.000Z');

    // Act
    const result = smokeFreeStreaks(state(periods), now);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]?.endedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(result.some((run) => run.isCurrent)).toBe(false);
  });

  it('smokeFreeStreaks_oneCompletedPeriod_returnsTheRunBeforeItAndTheRunSince', () => {
    // Arrange
    const periods = [period('2026-01-11T00:00:00.000Z', '2026-01-21T00:00:00.000Z')];
    const now = new Date('2026-01-26T00:00:00.000Z');

    // Act
    const result = smokeFreeStreaks(state(periods), now);

    // Assert
    expect(result.map((run) => run.elapsed.days)).toEqual([10, 5]);
    expect(result[1]?.isCurrent).toBe(true);
  });
});
