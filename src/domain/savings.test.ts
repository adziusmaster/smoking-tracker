import { describe, expect, it } from 'vitest';
import { cigaretteSettings } from './testSettings';
import { computeSavings, lifetimeAfterSlip } from './savings';
import type { QuitState, Settings } from './types';

const baseState = (overrides: Partial<QuitState> = {}): QuitState => ({
  settings: cigaretteSettings(),
  slips: [],
  periods: [], cravingEvents: [],
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
    expect(result.unitsAvoided).toBe(645);
    expect(result.moneySavedMinor).toBe(35_475);
    expect(result.minutesNotLost).toBe(12_900);
    expect(result.lifetimeCigarettes).toBe(43_834);
  });

  it('computeSavings_withSlip_subtractsOnlyTheCigarettesSmoked', () => {
    // Arrange
    const state = baseState({
      slips: [{ id: 1, occurredAt: '2026-08-05T22:00:00+02:00', unitCount: 3, trigger: 'alcohol', note: null, product: null }],
    });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = computeSavings(state, now);

    // Assert
    expect(result.unitsAvoided).toBe(642);
    expect(result.lifetimeCigarettes).toBe(43_837);
  });

  it('computeSavings_withCompletedRelapsePeriod_subtractsPeriodConsumption', () => {
    // Arrange — a 10-day relapse at 20/day = 200 cigarettes
    const state = baseState({
      periods: [{
        id: 1,
        startedAt: '2026-07-01T00:00:00+02:00',
        endedAt: '2026-07-11T00:00:00+02:00',
        averageUnitsPerDay: 20,
        note: null,
      }],
    });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = computeSavings(state, now);

    // Assert
    expect(result.unitsAvoided).toBe(445);
    expect(result.lifetimeCigarettes).toBe(44_034);
  });

  it('computeSavings_relapseLongerThanQuitAttempt_clampsAvoidedAtZero', () => {
    // Arrange
    const state = baseState({
      slips: [{ id: 1, occurredAt: '2026-08-01T00:00:00+02:00', unitCount: 9_999, trigger: null, note: null, product: null }],
    });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = computeSavings(state, now);

    // Assert
    expect(result.unitsAvoided).toBe(0);
    expect(result.moneySavedMinor).toBe(0);
    expect(result.minutesNotLost).toBe(0);
  });

  it('computeSavings_openRelapsePeriod_countsConsumptionUpToNow', () => {
    // Arrange — still smoking, started 4 days ago at 20/day
    const state = baseState({
      periods: [{ id: 1, startedAt: '2026-08-04T08:00:00+02:00', endedAt: null, averageUnitsPerDay: 20, note: null }],
    });
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = computeSavings(state, now);

    // Assert — 645 - (4 x 20) = 565
    expect(result.unitsAvoided).toBe(565);
  });

  it('computeSavings_vapeFortyThreeDays_moneyFromWeeklySpend', () => {
    // Arrange — 43 days x 15 = 645 uses; 645 x 2100 / (7 x 15) = 12_900
    const state: QuitState = { settings: vape(), slips: [], periods: [], cravingEvents: [] };

    // Act
    const result = computeSavings(state, new Date('2026-08-08T08:00:00+02:00'));

    // Assert
    expect(result.unitsAvoided).toBe(645);
    expect(result.moneySavedMinor).toBe(12_900);
    expect(result.minutesNotLost).toBeNull();
    expect(result.lifetimeCigarettes).toBeNull();
  });

  it('computeSavings_vapeRateChanged_recomputesMoneyFromWeeklySpend', () => {
    // Arrange — double the rate, same weekly spend: money over 43 days is unchanged (43/7 weeks of spend)
    const state: QuitState = { settings: vape({ unitsPerDay: 30 }), slips: [], periods: [], cravingEvents: [] };

    // Act
    const result = computeSavings(state, new Date('2026-08-08T08:00:00+02:00'));

    // Assert
    expect(result.unitsAvoided).toBe(1290);
    expect(result.moneySavedMinor).toBe(12_900);
  });

  it('computeSavings_vapeWithMultiUnitSlip_subtractsTheLoggedUnits', () => {
    // Arrange — a slip logged as 5 cigarettes before the user switched product to vape
    const state: QuitState = {
      settings: vape(),
      slips: [{ id: 1, occurredAt: '2026-08-01T00:00:00+02:00', unitCount: 5, trigger: null, note: null, product: null }],
      periods: [], cravingEvents: [],
    };

    // Act
    const result = computeSavings(state, new Date('2026-08-08T08:00:00+02:00'));

    // Assert
    expect(result.unitsAvoided).toBe(640);
  });

  it('computeSavings_heatedSwitcherWithSlip_lifetimeIsHistoryOnly', () => {
    // Arrange — 60 months x 30.44 x 10 = 18_264 cigarettes; the stick slip is not a cigarette
    const state: QuitState = {
      settings: cigaretteSettings({ product: 'heated', cigaretteHistory: { months: 60, cigarettesPerDay: 10 } }),
      slips: [{ id: 1, occurredAt: '2026-08-01T00:00:00+02:00', unitCount: 3, trigger: null, note: null, product: null }],
      periods: [], cravingEvents: [],
    };

    // Act
    const result = computeSavings(state, new Date('2026-08-08T08:00:00+02:00'));

    // Assert
    expect(result.lifetimeCigarettes).toBe(18_264);
    expect(result.minutesNotLost).toBeNull();
  });
});

const vape = (overrides: Partial<Settings> = {}): Settings =>
  cigaretteSettings({ product: 'vape', unitsPerDay: 15, cost: { kind: 'weekly', weeklySpendMinor: 2100 }, cigaretteHistory: null, ...overrides });

describe('lifetimeAfterSlip', () => {
  it('lifetimeAfterSlip_cigarettes_addsTheNewSlip', () => {
    // Arrange
    const state: QuitState = { settings: cigaretteSettings(), slips: [], periods: [], cravingEvents: [] };

    // Act
    const result = lifetimeAfterSlip(state, 2, 'cigarettes', new Date('2026-08-08T08:00:00+02:00'));

    // Assert — 96 x 30.44 x 15 = 43_834, + 2
    expect(result).toBe(43_836);
  });

  it('lifetimeAfterSlip_heatedSwitcher_isNull', () => {
    // Arrange
    const state: QuitState = {
      settings: cigaretteSettings({ product: 'heated', cigaretteHistory: { months: 60, cigarettesPerDay: 10 } }),
      slips: [],
      periods: [], cravingEvents: [],
    };

    // Act
    const result = lifetimeAfterSlip(state, 1, 'heated', new Date('2026-08-08T08:00:00+02:00'));

    // Assert
    expect(result).toBeNull();
  });

  it('lifetimeAfterSlip_cigarettesWithoutHistory_isNull', () => {
    // Arrange
    const state: QuitState = { settings: cigaretteSettings({ cigaretteHistory: null }), slips: [], periods: [], cravingEvents: [] };

    // Act
    const result = lifetimeAfterSlip(state, 1, 'cigarettes', new Date('2026-08-08T08:00:00+02:00'));

    // Assert
    expect(result).toBeNull();
  });

  it('lifetimeAfterSlip_heatedSwitcherSmokesCigarettes_addsThemToTheCigaretteTotal', () => {
    // Arrange — 60 x 30.44 x 10 = 18_264 cigarettes before, plus 2 now
    const state: QuitState = {
      settings: cigaretteSettings({ product: 'heated', cigaretteHistory: { months: 60, cigarettesPerDay: 10 } }),
      slips: [], periods: [], cravingEvents: [],
    };

    // Act
    const result = lifetimeAfterSlip(state, 2, 'cigarettes', new Date('2026-08-08T08:00:00+02:00'));

    // Assert
    expect(result).toBe(18_266);
  });
});

describe('slips of another product', () => {
  const heatedSwitcher = (slips: QuitState['slips']): QuitState => ({
    settings: cigaretteSettings({ product: 'heated', unitsPerDay: 15, cigaretteHistory: { months: 60, cigarettesPerDay: 10 } }),
    slips, periods: [], cravingEvents: [],
  });

  it('computeSavings_cigaretteSlipForHeatedUser_doesNotReduceSticksNotUsed', () => {
    // Arrange
    const state = heatedSwitcher([{ id: 1, occurredAt: '2026-08-01T00:00:00+02:00', unitCount: 3, trigger: null, note: null, product: 'cigarettes' }]);

    // Act
    const result = computeSavings(state, new Date('2026-08-08T08:00:00+02:00'));

    // Assert — 43 days x 15 = 645 sticks, untouched by the cigarettes
    expect(result.unitsAvoided).toBe(645);
  });

  it('computeSavings_cigaretteSlipForHeatedUser_addsToLifetimeCigarettes', () => {
    // Arrange
    const state = heatedSwitcher([{ id: 1, occurredAt: '2026-08-01T00:00:00+02:00', unitCount: 3, trigger: null, note: null, product: 'cigarettes' }]);

    // Act
    const result = computeSavings(state, new Date('2026-08-08T08:00:00+02:00'));

    // Assert
    expect(result.lifetimeCigarettes).toBe(18_267);
  });

  it('computeSavings_ownProductSlipStoredAsNull_stillSubtracts', () => {
    // Arrange — slips logged before migration v5 have product null, meaning the user's own
    const state = heatedSwitcher([{ id: 1, occurredAt: '2026-08-01T00:00:00+02:00', unitCount: 3, trigger: null, note: null, product: null }]);

    // Act
    const result = computeSavings(state, new Date('2026-08-08T08:00:00+02:00'));

    // Assert
    expect(result.unitsAvoided).toBe(642);
  });
});
