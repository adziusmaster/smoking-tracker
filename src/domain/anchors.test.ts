import { describe, expect, it } from 'vitest';
import { resolveAnchors } from './anchors';
import type { QuitState } from './types';

const QUIT = '2026-06-26T08:00:00+02:00';

const state = (overrides: Partial<QuitState> = {}): QuitState => ({
  settings: {
    quitDate: QUIT,
    cigarettesPerDay: 15,
    cigarettesPerPack: 20,
    packPriceMinor: 1100,
    currency: 'EUR',
    timezone: 'Europe/Amsterdam',
    lifetimeBaseline: 0,
  },
  slips: [],
  periods: [],
  ...overrides,
});

const now = new Date('2026-08-08T08:00:00+02:00');

describe('resolveAnchors', () => {
  it('resolveAnchors_noSlipsOrPeriods_bothAnchorsAreQuitDate', () => {
    // Arrange
    const input = state();

    // Act
    const result = resolveAnchors(input, now);

    // Assert
    expect(result.fast).toBe(QUIT);
    expect(result.cumulative).toBe(QUIT);
    expect(result.isCurrentlySmoking).toBe(false);
  });

  it('resolveAnchors_withSlip_movesFastAnchorButNotCumulative', () => {
    // Arrange
    const slipAt = '2026-08-05T22:00:00+02:00';
    const input = state({ slips: [{ id: 1, occurredAt: slipAt, cigaretteCount: 3, trigger: 'social', note: null }] });

    // Act
    const result = resolveAnchors(input, now);

    // Assert
    expect(result.fast).toBe(slipAt);
    expect(result.cumulative).toBe(QUIT);
  });

  it('resolveAnchors_multipleSlips_usesMostRecent', () => {
    // Arrange
    const input = state({
      slips: [
        { id: 1, occurredAt: '2026-07-04T20:00:00+02:00', cigaretteCount: 1, trigger: null, note: null },
        { id: 2, occurredAt: '2026-08-05T22:00:00+02:00', cigaretteCount: 3, trigger: null, note: null },
      ],
    });

    // Act
    const result = resolveAnchors(input, now);

    // Assert
    expect(result.fast).toBe('2026-08-05T22:00:00+02:00');
  });

  it('resolveAnchors_completedRelapsePeriod_movesCumulativeAnchorToItsEnd', () => {
    // Arrange
    const endedAt = '2026-07-11T00:00:00+02:00';
    const input = state({
      periods: [{ id: 1, startedAt: '2026-07-01T00:00:00+02:00', endedAt, averageCigarettesPerDay: 20, note: null }],
    });

    // Act
    const result = resolveAnchors(input, now);

    // Assert
    expect(result.cumulative).toBe(endedAt);
    expect(result.fast).toBe(endedAt);
    expect(result.isCurrentlySmoking).toBe(false);
  });

  it('resolveAnchors_openRelapsePeriod_reportsCurrentlySmoking', () => {
    // Arrange
    const input = state({
      periods: [{ id: 1, startedAt: '2026-08-04T08:00:00+02:00', endedAt: null, averageCigarettesPerDay: 20, note: null }],
    });

    // Act
    const result = resolveAnchors(input, now);

    // Assert
    expect(result.isCurrentlySmoking).toBe(true);
  });

  it('resolveAnchors_slipOlderThanRelapseEnd_prefersTheRelapseEndForFastAnchor', () => {
    // Arrange
    const input = state({
      slips: [{ id: 1, occurredAt: '2026-07-02T12:00:00+02:00', cigaretteCount: 2, trigger: null, note: null }],
      periods: [{ id: 1, startedAt: '2026-07-01T00:00:00+02:00', endedAt: '2026-07-11T00:00:00+02:00', averageCigarettesPerDay: 20, note: null }],
    });

    // Act
    const result = resolveAnchors(input, now);

    // Assert
    expect(result.fast).toBe('2026-07-11T00:00:00+02:00');
  });

  it('resolveAnchors_slipAfterRelapseEnd_leavesCumulativeAnchorAtRelapseEnd', () => {
    // Arrange
    const periodEnd = '2026-07-11T00:00:00+02:00';
    const slipAt = '2026-08-05T22:00:00+02:00';
    const input = state({
      periods: [{ id: 1, startedAt: '2026-07-01T00:00:00+02:00', endedAt: periodEnd, averageCigarettesPerDay: 20, note: null }],
      slips: [{ id: 1, occurredAt: slipAt, cigaretteCount: 2, trigger: null, note: null }],
    });

    // Act
    const result = resolveAnchors(input, now);

    // Assert
    expect(result.cumulative).toBe(periodEnd);
    expect(result.fast).toBe(slipAt);
  });
});
