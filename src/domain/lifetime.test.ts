import { describe, expect, it } from 'vitest';
import { estimateCigarettesBeforeQuitting } from './lifetime';
import { cigaretteSettings } from './testSettings';
import type { Settings } from './types';

const smoker = (months: number, perDay: number): Settings =>
  cigaretteSettings({ unitsPerDay: perDay, cigaretteHistory: months > 0 ? { months, cigarettesPerDay: perDay } : null });

describe('estimateCigarettesBeforeQuitting', () => {
  it('estimateCigarettesBeforeQuitting_noHistory_returnsNull', () => {
    // Arrange
    const input = smoker(0, 15);

    // Act
    const result = estimateCigarettesBeforeQuitting(input);

    // Assert
    expect(result).toBeNull();
  });

  it('estimateCigarettesBeforeQuitting_twelveYearsAtFifteenADay_returnsRoundedEstimate', () => {
    // Arrange — 144 months x 30.44 days x 15/day = 65_750.4
    const input = smoker(144, 15);

    // Act
    const result = estimateCigarettesBeforeQuitting(input);

    // Assert
    expect(result).toBe(65_750);
  });

  it('estimateCigarettesBeforeQuitting_higherDailyRate_producesHigherEstimate', () => {
    // Arrange — proves the estimate is live, not frozen at onboarding
    const light = smoker(120, 5);
    const heavy = smoker(120, 25);

    // Act
    const lightResult = estimateCigarettesBeforeQuitting(light) ?? 0;
    const heavyResult = estimateCigarettesBeforeQuitting(heavy);

    // Assert
    expect(heavyResult).toBe(lightResult * 5);
  });

  it('estimateCigarettesBeforeQuitting_combustibleRateEditedWithoutReload_usesCurrentDailyRate', () => {
    // Arrange — the stored history rate lags; for cigarettes the daily rate is the truth
    const input = cigaretteSettings({ unitsPerDay: 20, cigaretteHistory: { months: 12, cigarettesPerDay: 10 } });

    // Act
    const result = estimateCigarettesBeforeQuitting(input);

    // Assert — 12 x 30.44 x 20 = 7_305.6
    expect(result).toBe(7_306);
  });

  it('estimateCigarettesBeforeQuitting_heatedSwitcher_usesPriorCigaretteRate', () => {
    // Arrange — 12 x 30.44 x 10 = 3_652.8; the 30 sticks a day are not cigarettes
    const input = cigaretteSettings({ product: 'heated', unitsPerDay: 30, cigaretteHistory: { months: 12, cigarettesPerDay: 10 } });

    // Act
    const result = estimateCigarettesBeforeQuitting(input);

    // Assert
    expect(result).toBe(3_653);
  });
});

