import { describe, expect, it } from 'vitest';
import { parseMinorUnits, parseNonNegativeInt, parsePositiveInt } from './parse';

describe('parsePositiveInt', () => {
  it('parsePositiveInt_wholeNumberAboveZero_returnsIt', () => {
    // Arrange & Act
    const result = parsePositiveInt(' 25 ');

    // Assert
    expect(result).toBe(25);
  });

  it('parsePositiveInt_zero_returnsNullBecauseZeroIsNotAboveZero', () => {
    // Arrange & Act
    const result = parsePositiveInt('0');

    // Assert
    expect(result).toBeNull();
  });

  it('parsePositiveInt_unreadableInput_returnsNull', () => {
    // Arrange
    const inputs = ['', 'abc', '-5', '1.234', '11,50'];

    // Act
    const results = inputs.map(parsePositiveInt);

    // Assert
    expect(results).toEqual([null, null, null, null, null]);
  });
});

describe('parseNonNegativeInt', () => {
  it('parseNonNegativeInt_zero_returnsZeroBecauseQuittingRightNowIsValid', () => {
    // Arrange & Act
    const result = parseNonNegativeInt('0');

    // Assert
    expect(result).toBe(0);
  });

  it('parseNonNegativeInt_wholeNumber_returnsIt', () => {
    // Arrange & Act
    const result = parseNonNegativeInt('43');

    // Assert
    expect(result).toBe(43);
  });

  it('parseNonNegativeInt_unreadableInput_returnsNull', () => {
    // Arrange
    const inputs = ['', 'abc', '-5', '1.234', '11,50'];

    // Act
    const results = inputs.map(parseNonNegativeInt);

    // Assert
    expect(results).toEqual([null, null, null, null, null]);
  });
});

describe('parseMinorUnits', () => {
  it('parseMinorUnits_twoDecimalPlaces_returnsIntegerMinorUnits', () => {
    // Arrange & Act
    const result = parseMinorUnits('9.50');

    // Assert
    expect(result).toBe(950);
  });

  it('parseMinorUnits_commaDecimalSeparator_isAcceptedLikeADot', () => {
    // Arrange & Act
    const result = parseMinorUnits('11,50');

    // Assert
    expect(result).toBe(1150);
  });

  it('parseMinorUnits_zero_returnsZeroBecauseAFreePackIsStillANumber', () => {
    // Arrange & Act
    const result = parseMinorUnits('0');

    // Assert
    expect(result).toBe(0);
  });

  it('parseMinorUnits_unreadableInput_returnsNull', () => {
    // Arrange — '1.234' has more precision than minor units can hold, so it is rejected
    // rather than rounded behind the user's back
    const inputs = ['', 'abc', '-5', '1.234'];

    // Act
    const results = inputs.map(parseMinorUnits);

    // Assert
    expect(results).toEqual([null, null, null, null]);
  });
});
