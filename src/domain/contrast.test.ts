import { describe, expect, it } from 'vitest';
import { contrastRatio, relativeLuminance } from './contrast';

describe('contrastRatio', () => {
  it('contrastRatio_blackOnWhite_is21', () => {
    // Arrange & Act
    const ratio = contrastRatio('#000000', '#FFFFFF');

    // Assert
    expect(ratio).toBeCloseTo(21, 5);
  });

  it('contrastRatio_sameColour_is1', () => {
    // Arrange & Act
    const ratio = contrastRatio('#0E7C86', '#0E7C86');

    // Assert
    expect(ratio).toBe(1);
  });

  it('contrastRatio_isSymmetric', () => {
    // Arrange & Act
    const forward = contrastRatio('#0F2830', '#F2F6F7');
    const backward = contrastRatio('#F2F6F7', '#0F2830');

    // Assert
    expect(forward).toBe(backward);
  });
});

describe('relativeLuminance', () => {
  it('relativeLuminance_invalidHex_throws', () => {
    // Arrange & Act
    const act = () => relativeLuminance('teal');

    // Assert
    expect(act).toThrow(/#RRGGBB/);
  });
});
