import { describe, expect, it } from 'vitest';
import { defaultValues, parseSetupForm, switchProduct, valuesFromSettings, type SetupFormValues } from './setupForm';
import { cigaretteSettings } from './testSettings';

const STICKS = { perDay: 'Sticks per day', perPack: 'Sticks per pack', packPrice: 'Price per pack' };
const CIGS = { perDay: 'Cigarettes per day', perPack: 'Cigarettes per pack', packPrice: 'Price per pack' };
const VAPE = { perDay: 'Uses per day', perPack: null, packPrice: null };

const context = {
  quitMoment: new Date('2026-08-01T10:00:00Z'),
  now: new Date('2026-08-08T10:00:00Z'),
  currency: 'EUR',
  timezone: 'UTC',
  labels: STICKS,
};

const values = (overrides: Partial<SetupFormValues> = {}): SetupFormValues => ({
  product: 'heated',
  unitsPerDay: '12',
  unitsPerPack: '20',
  packPrice: '8,50',
  weeklySpend: '',
  smokedBefore: false,
  historyYears: '',
  historyMonths: '',
  priorPerDay: '',
  ...overrides,
});

describe('parseSetupForm', () => {
  it('parseSetupForm_heatedNoHistory_buildsPackSettingsWithNullHistory', () => {
    // Arrange & Act
    const result = parseSetupForm(values(), context);

    // Assert
    expect(result).toEqual({
      ok: true,
      settings: {
        quitDate: '2026-08-01T10:00:00.000Z',
        product: 'heated',
        unitsPerDay: 12,
        cost: { kind: 'pack', unitsPerPack: 20, packPriceMinor: 850 },
        currency: 'EUR',
        timezone: 'UTC',
        cigaretteHistory: null,
      },
    });
  });

  it('parseSetupForm_heatedSmokedBefore_buildsHistoryFromPriorRate', () => {
    // Arrange & Act
    const result = parseSetupForm(values({ smokedBefore: true, historyYears: '10', historyMonths: '6', priorPerDay: '20' }), context);

    // Assert
    expect(result.ok && result.settings.cigaretteHistory).toEqual({ months: 126, cigarettesPerDay: 20 });
  });

  it('parseSetupForm_heatedSmokedBeforeWithoutRate_isAnError', () => {
    // Arrange & Act
    const result = parseSetupForm(values({ smokedBefore: true, historyYears: '10', priorPerDay: '' }), context);

    // Assert
    expect(result).toEqual({ ok: false, error: 'Cigarettes per day must be a whole number above zero.' });
  });

  it('parseSetupForm_heatedSmokedBeforeWithoutDuration_isAnError', () => {
    // Arrange & Act
    const result = parseSetupForm(values({ smokedBefore: true, priorPerDay: '10' }), context);

    // Assert
    expect(result).toEqual({ ok: false, error: 'How long did you smoke? Enter years, months, or both.' });
  });

  it('parseSetupForm_heatedNotSmokedBeforeWithStaleHistory_ignoresIt', () => {
    // Arrange & Act — the user answered Yes, typed numbers, then switched to No
    const result = parseSetupForm(values({ smokedBefore: false, historyYears: '10', priorPerDay: '10' }), context);

    // Assert
    expect(result.ok && result.settings.cigaretteHistory).toBeNull();
  });

  it('parseSetupForm_cigarettesWithYears_historyRateIsDailyRate', () => {
    // Arrange & Act
    const result = parseSetupForm(values({ product: 'cigarettes', unitsPerDay: '15', historyYears: '8' }), { ...context, labels: CIGS });

    // Assert
    expect(result.ok && result.settings.cigaretteHistory).toEqual({ months: 96, cigarettesPerDay: 15 });
  });

  it('parseSetupForm_vapeWithStalePackFields_ignoresThem', () => {
    // Arrange & Act
    const result = parseSetupForm(
      values({ product: 'vape', unitsPerDay: '15', weeklySpend: '21', unitsPerPack: 'garbage', packPrice: 'garbage' }),
      { ...context, labels: VAPE },
    );

    // Assert
    expect(result.ok && result.settings.cost).toEqual({ kind: 'weekly', weeklySpendMinor: 2100 });
  });

  it('parseSetupForm_vapeWithoutWeeklySpend_isAnError', () => {
    // Arrange & Act
    const result = parseSetupForm(values({ product: 'vape', weeklySpend: '' }), { ...context, labels: VAPE });

    // Assert
    expect(result).toEqual({ ok: false, error: 'Weekly spend must look like 15 or 15.50.' });
  });

  it('parseSetupForm_zeroPerDay_errorUsesTheProductLabel', () => {
    // Arrange & Act
    const result = parseSetupForm(values({ unitsPerDay: '0' }), context);

    // Assert
    expect(result).toEqual({ ok: false, error: 'Sticks per day must be a whole number above zero.' });
  });

  it('parseSetupForm_moreThanEightyYears_isAnError', () => {
    // Arrange & Act
    const result = parseSetupForm(values({ product: 'cigarettes', historyYears: '500' }), { ...context, labels: CIGS });

    // Assert
    expect(result).toEqual({ ok: false, error: 'Years must be 80 or fewer.' });
  });

  it('parseSetupForm_futureQuitMoment_isAnError', () => {
    // Arrange & Act
    const result = parseSetupForm(values(), { ...context, quitMoment: new Date('2026-08-09T00:00:00Z') });

    // Assert
    expect(result).toEqual({ ok: false, error: 'Your quit date cannot be in the future.' });
  });
});

describe('valuesFromSettings', () => {
  it('valuesFromSettings_cigarettes_roundTripsThroughParse', () => {
    // Arrange
    const settings = cigaretteSettings({ quitDate: '2026-08-01T10:00:00.000Z', timezone: 'UTC' });

    // Act
    const result = parseSetupForm(valuesFromSettings(settings), { ...context, labels: CIGS });

    // Assert
    expect(result).toEqual({ ok: true, settings });
  });

  it('valuesFromSettings_vapeSwitcher_roundTripsThroughParse', () => {
    // Arrange
    const settings = cigaretteSettings({
      quitDate: '2026-08-01T10:00:00.000Z', timezone: 'UTC', product: 'vape',
      cost: { kind: 'weekly', weeklySpendMinor: 1850 }, cigaretteHistory: { months: 30, cigarettesPerDay: 12 },
    });

    // Act
    const result = parseSetupForm(valuesFromSettings(settings), { ...context, labels: VAPE });

    // Assert
    expect(result).toEqual({ ok: true, settings });
  });

  it('defaultValues_rollYourOwn_leavesPerPackBlank', () => {
    // Arrange & Act
    const result = defaultValues('roll-your-own', null);

    // Assert
    expect(result.unitsPerPack).toBe('');
  });
});

describe('switchProduct', () => {
  it('switchProduct_heatedToSnus_keepsSharedFieldsAndFillsBlankPackDefault', () => {
    // Arrange
    const before = values({ unitsPerPack: '', smokedBefore: true, historyYears: '5', priorPerDay: '10' });

    // Act
    const after = switchProduct(before, 'snus', 20);

    // Assert
    expect(after).toEqual({ ...before, product: 'snus', unitsPerPack: '20' });
  });

  it('switchProduct_filledPackField_isNotOverwritten', () => {
    // Arrange & Act
    const after = switchProduct(values({ unitsPerPack: '25' }), 'cigarettes', 20);

    // Assert
    expect(after.unitsPerPack).toBe('25');
  });

  it('switchProduct_toVape_keepsDailyRateForTheChips', () => {
    // Arrange & Act
    const after = switchProduct(values({ unitsPerDay: '12' }), 'vape', null);

    // Assert
    expect(after.product).toBe('vape');
    expect(after.unitsPerDay).toBe('12');
  });
});
