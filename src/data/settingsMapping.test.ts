import { describe, expect, it } from 'vitest';
import { rowToSettings, settingsToParams, type SettingsRow } from './settingsMapping';

const row = (overrides: Partial<SettingsRow> = {}): SettingsRow => ({
  quit_date: '2026-06-26T06:00:00.000Z',
  cigarettes_per_day: 15,
  cigarettes_per_pack: 20,
  pack_price_minor: 1100,
  currency: 'EUR',
  timezone: 'UTC',
  smoked_for_months: 96,
  product: 'cigarettes',
  weekly_spend_minor: null,
  prior_cigarettes_per_day: null,
  ...overrides,
});

describe('rowToSettings', () => {
  it('rowToSettings_cigarettes_derivesHistoryRateFromDailyRate', () => {
    // Arrange & Act
    const settings = rowToSettings(row());

    // Assert
    expect(settings.cost).toEqual({ kind: 'pack', unitsPerPack: 20, packPriceMinor: 1100 });
    expect(settings.cigaretteHistory).toEqual({ months: 96, cigarettesPerDay: 15 });
  });

  it('rowToSettings_cigarettesWithZeroMonths_hasNoHistory', () => {
    // Arrange & Act
    const settings = rowToSettings(row({ smoked_for_months: 0 }));

    // Assert
    expect(settings.cigaretteHistory).toBeNull();
  });

  it('rowToSettings_vape_usesWeeklyModelAndPriorRate', () => {
    // Arrange & Act
    const settings = rowToSettings(row({
      product: 'vape', cigarettes_per_pack: 1, pack_price_minor: 0,
      weekly_spend_minor: 1500, prior_cigarettes_per_day: 10, smoked_for_months: 60,
    }));

    // Assert
    expect(settings.cost).toEqual({ kind: 'weekly', weeklySpendMinor: 1500 });
    expect(settings.cigaretteHistory).toEqual({ months: 60, cigarettesPerDay: 10 });
  });

  it('rowToSettings_heatedWithoutPriorRate_hasNoHistory', () => {
    // Arrange & Act
    const settings = rowToSettings(row({ product: 'heated', smoked_for_months: 60, prior_cigarettes_per_day: null }));

    // Assert
    expect(settings.cigaretteHistory).toBeNull();
  });

  it('rowToSettings_vapeWithoutWeeklySpend_throws', () => {
    // Arrange & Act
    const act = () => rowToSettings(row({ product: 'vape', weekly_spend_minor: null }));

    // Assert
    expect(act).toThrow(/weekly_spend_minor/);
  });
});

describe('settingsToParams', () => {
  it('settingsToParams_vape_writesPlaceholderPackColumnsAndWeeklySpend', () => {
    // Arrange
    const settings = rowToSettings(row({ product: 'vape', weekly_spend_minor: 1500, prior_cigarettes_per_day: 10, smoked_for_months: 60 }));

    // Act
    const params = settingsToParams(settings);

    // Assert — quit, perDay, perPack, price, currency, tz, months, product, weekly, prior
    expect(params).toEqual(['2026-06-26T06:00:00.000Z', 15, 1, 0, 'EUR', 'UTC', 60, 'vape', 1500, 10]);
  });

  it('settingsToParams_cigarettes_leavesPriorRateNull', () => {
    // Arrange
    const settings = rowToSettings(row());

    // Act
    const params = settingsToParams(settings);

    // Assert
    expect(params[9]).toBeNull();
    expect(params[6]).toBe(96);
  });
});
