import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/domain/contrast';
import { PALETTES, type Palette } from './palette';

type Scheme = keyof typeof PALETTES;

describe('PALETTES', () => {
  it('PALETTES_bothSchemes_defineTheSameKeys', () => {
    // Arrange & Act
    const light = Object.keys(PALETTES.light).sort();
    const dark = Object.keys(PALETTES.dark).sort();

    // Assert
    expect(dark).toEqual(light);
  });

  it('PALETTES_everyValue_isSixDigitHex', () => {
    // Arrange — no translucent tokens: a blended colour can't be contrast-checked here
    const all = (p: Palette) => Object.entries(p);

    // Act
    const bad = [...all(PALETTES.light), ...all(PALETTES.dark)].filter(([, v]) => !/^#[0-9A-F]{6}$/i.test(v));

    // Assert
    expect(bad).toEqual([]);
  });

  // [scheme, foreground, background, WCAG minimum]
  const pairs: [Scheme, keyof Palette, keyof Palette, number][] = (['light', 'dark'] as const).flatMap((scheme) => [
    [scheme, 'ink', 'bg', 4.5],
    [scheme, 'ink', 'surface', 4.5],
    [scheme, 'muted', 'bg', 4.5],
    [scheme, 'muted', 'surface', 4.5],
    [scheme, 'faint', 'bg', 3],
    [scheme, 'faint', 'surface', 3],
    [scheme, 'accentText', 'bg', 4.5],
    [scheme, 'onAccent', 'accent', 4.5],
    [scheme, 'onHero', 'heroFrom', 4.5],
    [scheme, 'onHero', 'heroTo', 4.5],
    [scheme, 'onHero', 'heroTile', 4.5],
    [scheme, 'achieve', 'bg', 4.5],
    [scheme, 'achieve', 'surface', 4.5],
    [scheme, 'onSos', 'sos', 4.5],
    [scheme, 'danger', 'dangerWash', 4.5],
    [scheme, 'achieve', 'achieveWash', 3],
    [scheme, 'ink', 'achieveWash', 4.5],
    [scheme, 'ink', 'doneWash', 4.5],
  ] as [Scheme, keyof Palette, keyof Palette, number][]);

  it.each(pairs)('PALETTES_%s_%sOn%s_meetsContrastMinimum', (scheme, fg, bg, minimum) => {
    // Arrange
    const palette = PALETTES[scheme];

    // Act
    const ratio = contrastRatio(palette[fg], palette[bg]);

    // Assert
    expect(ratio).toBeGreaterThanOrEqual(minimum);
  });
});
