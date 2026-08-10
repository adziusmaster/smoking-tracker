import { describe, expect, it } from 'vitest';
import { estimateCigarettesBeforeQuitting } from './lifetime';
import type { Settings } from './types';

const settings = (overrides: Partial<Settings> = {}): Settings => ({
  quitDate: '2026-06-26T06:00:00.000Z',
  cigarettesPerDay: 15,
  cigarettesPerPack: 20,
  packPriceMinor: 1100,
  currency: 'EUR',
  timezone: 'Europe/Amsterdam',
  smokedForMonths: 0,
  ...overrides,
});

describe('estimateCigarettesBeforeQuitting', () => {
  it('estimateCigarettesBeforeQuitting_zeroMonths_returnsZero', () => {
    // Arrange
    const input = settings({ smokedForMonths: 0 });

    // Act
    const result = estimateCigarettesBeforeQuitting(input);

    // Assert
    expect(result).toBe(0);
  });

  it('estimateCigarettesBeforeQuitting_twelveYearsAtFifteenADay_returnsRoundedEstimate', () => {
    // Arrange — 144 months x 30.44 days x 15/day = 65_750.4
    const input = settings({ smokedForMonths: 144, cigarettesPerDay: 15 });

    // Act
    const result = estimateCigarettesBeforeQuitting(input);

    // Assert
    expect(result).toBe(65_750);
  });

  it('estimateCigarettesBeforeQuitting_higherDailyRate_producesHigherEstimate', () => {
    // Arrange — proves the estimate is live, not frozen at onboarding
    const light = settings({ smokedForMonths: 120, cigarettesPerDay: 5 });
    const heavy = settings({ smokedForMonths: 120, cigarettesPerDay: 25 });

    // Act
    const lightResult = estimateCigarettesBeforeQuitting(light);
    const heavyResult = estimateCigarettesBeforeQuitting(heavy);

    // Assert
    expect(heavyResult).toBe(lightResult * 5);
  });

  it('estimateCigarettesBeforeQuitting_partialMonths_returnsAWholeNumber', () => {
    // Arrange
    const input = settings({ smokedForMonths: 7, cigarettesPerDay: 13 });

    // Act
    const result = estimateCigarettesBeforeQuitting(input);

    // Assert
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
  });
});
