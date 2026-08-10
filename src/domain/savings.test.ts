import { describe, expect, it } from 'vitest';
import { computeSavings } from './savings';
import type { QuitState } from './types';

const baseState = (overrides: Partial<QuitState> = {}): QuitState => ({
  settings: {
    quitDate: '2026-06-26T08:00:00+02:00',
    cigarettesPerDay: 15,
    cigarettesPerPack: 20,
    packPriceMinor: 1100,
    currency: 'EUR',
    timezone: 'Europe/Amsterdam',
    lifetimeBaseline: 43_800,
  },
  slips: [],
  periods: [],
  ...overrides,
});

describe('computeSavings', () => {
  it('computeSavings_fortyThreeCleanDays_returnsAvoidedMoneyAndTimeNotLost', () => {
    // Arrange
    const state = baseState();
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = computeSavings(state, now);

    // Assert — 43 days x 15 = 645 cigarettes; 645 x 1100 / 20 = 35_475 minor units
    expect(result.cigarettesAvoided).toBe(645);
    expect(result.moneySavedMinor).toBe(35_475);
    expect(result.minutesNotLost).toBe(12_900);
    expect(result.lifetimeTotal).toBe(43_800);
  });

  it('computeSavings_withSlip_subtractsOnlyTheCigarettesSmoked', () => {
    // Arrange
    const state = baseState({
      slips: [{ id: 1, occurredAt: '2026-08-05T22:00:00+02:00', cigaretteCount: 3, trigger: 'alcohol', note: null }],
    });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = computeSavings(state, now);

    // Assert
    expect(result.cigarettesAvoided).toBe(642);
    expect(result.lifetimeTotal).toBe(43_803);
  });

  it('computeSavings_withCompletedRelapsePeriod_subtractsPeriodConsumption', () => {
    // Arrange — a 10-day relapse at 20/day = 200 cigarettes
    const state = baseState({
      periods: [{
        id: 1,
        startedAt: '2026-07-01T00:00:00+02:00',
        endedAt: '2026-07-11T00:00:00+02:00',
        averageCigarettesPerDay: 20,
        note: null,
      }],
    });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = computeSavings(state, now);

    // Assert
    expect(result.cigarettesAvoided).toBe(445);
    expect(result.lifetimeTotal).toBe(44_000);
  });

  it('computeSavings_relapseLongerThanQuitAttempt_clampsAvoidedAtZero', () => {
    // Arrange
    const state = baseState({
      slips: [{ id: 1, occurredAt: '2026-08-01T00:00:00+02:00', cigaretteCount: 9_999, trigger: null, note: null }],
    });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = computeSavings(state, now);

    // Assert
    expect(result.cigarettesAvoided).toBe(0);
    expect(result.moneySavedMinor).toBe(0);
    expect(result.minutesNotLost).toBe(0);
  });

  it('computeSavings_openRelapsePeriod_countsConsumptionUpToNow', () => {
    // Arrange — still smoking, started 4 days ago at 20/day
    const state = baseState({
      periods: [{ id: 1, startedAt: '2026-08-04T08:00:00+02:00', endedAt: null, averageCigarettesPerDay: 20, note: null }],
    });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = computeSavings(state, now);

    // Assert — 645 - (4 x 20) = 565
    expect(result.cigarettesAvoided).toBe(565);
  });
});
