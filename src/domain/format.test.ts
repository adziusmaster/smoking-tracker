import { describe, expect, it } from 'vitest';
import { formatCount, formatElapsed, formatMinutesNotLost, formatMoneyMinor } from './format';

describe('formatMoneyMinor', () => {
  it('formatMoneyMinor_euroAmount_rendersWithTwoDecimals', () => {
    // Arrange & Act
    const result = formatMoneyMinor(35_475, 'EUR');

    // Assert
    expect(result).toBe('€354.75');
  });

  it('formatMoneyMinor_zero_rendersZeroNotEmpty', () => {
    // Arrange & Act
    const result = formatMoneyMinor(0, 'EUR');

    // Assert
    expect(result).toBe('€0.00');
  });

  it('formatMoneyMinor_unknownCurrencyCode_fallsBackToCodePrefix', () => {
    // Arrange & Act
    const result = formatMoneyMinor(1234, 'XZZ');

    // Assert
    expect(result).toBe('XZZ 12.34');
  });
});

describe('formatElapsed', () => {
  it('formatElapsed_daysAndHours_rendersBoth', () => {
    // Arrange & Act
    const result = formatElapsed({ totalMs: 0, days: 43, hours: 6, minutes: 30 });

    // Assert
    expect(result).toBe('43 days, 6 hours');
  });

  it('formatElapsed_singleDay_usesSingularNoun', () => {
    // Arrange & Act
    const result = formatElapsed({ totalMs: 0, days: 1, hours: 1, minutes: 0 });

    // Assert
    expect(result).toBe('1 day, 1 hour');
  });

  it('formatElapsed_underOneDay_rendersHoursAndMinutes', () => {
    // Arrange & Act
    const result = formatElapsed({ totalMs: 0, days: 0, hours: 5, minutes: 12 });

    // Assert
    expect(result).toBe('5 hours, 12 minutes');
  });

  it('formatElapsed_underOneHour_rendersMinutesOnly', () => {
    // Arrange & Act
    const result = formatElapsed({ totalMs: 0, days: 0, hours: 0, minutes: 42 });

    // Assert
    expect(result).toBe('42 minutes');
  });
});

describe('formatMinutesNotLost', () => {
  it('formatMinutesNotLost_twelveThousandNineHundred_rendersAsDays', () => {
    // Arrange & Act
    const result = formatMinutesNotLost(12_900);

    // Assert
    expect(result).toBe('8 days');
  });

  it('formatMinutesNotLost_underADay_rendersHours', () => {
    // Arrange & Act
    const result = formatMinutesNotLost(300);

    // Assert
    expect(result).toBe('5 hours');
  });

  it('formatMinutesNotLost_zero_rendersZeroHours', () => {
    // Arrange & Act
    const result = formatMinutesNotLost(0);

    // Assert
    expect(result).toBe('0 hours');
  });
});

describe('formatCount', () => {
  it('formatCount_fiveFigureNumber_groupsThousands', () => {
    // Arrange & Act
    const result = formatCount(43_834);

    // Assert
    expect(result).toBe('43,834');
  });

  it('formatCount_zero_rendersZero', () => {
    // Arrange & Act
    const result = formatCount(0);

    // Assert
    expect(result).toBe('0');
  });

  it('formatCount_underOneThousand_hasNoSeparator', () => {
    // Arrange & Act
    const result = formatCount(645);

    // Assert
    expect(result).toBe('645');
  });
});
