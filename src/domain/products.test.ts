import { describe, expect, it } from 'vitest';
import {
  applicableMilestones,
  audienceIncludes,
  hasSmokingHistory,
  isCombustible,
  isConservativelyAnchored,
  pickVariant,
} from './products';
import { cigaretteSettings } from './testSettings';
import { MS_PER_HOUR, MS_PER_MINUTE, type Audience, type Milestone, type ProductId, type Settings } from './types';

const as = (product: ProductId, withHistory: boolean): Settings =>
  cigaretteSettings({
    product,
    cost: product === 'vape' ? { kind: 'weekly', weeklySpendMinor: 1500 } : { kind: 'pack', unitsPerPack: 20, packPriceMinor: 1000 },
    cigaretteHistory: withHistory ? { months: 60, cigarettesPerDay: 10 } : null,
  });

const milestone = (audience: Audience, extra: Partial<Milestone> = {}): Milestone => ({
  id: `m-${audience}`,
  title: 't',
  body: 'b',
  offsetMs: 20 * MS_PER_MINUTE,
  offsetEndMs: null,
  slipBehavior: 'restarts',
  sourceId: 'acs',
  phaseId: 'crash',
  audience,
  ...extra,
});

describe('isCombustible', () => {
  it('isCombustible_eachProduct_trueOnlyForCigarettesAndRollYourOwn', () => {
    // Arrange
    const ids: ProductId[] = ['cigarettes', 'roll-your-own', 'heated', 'vape', 'snus', 'pouches'];

    // Act
    const combustible = ids.filter(isCombustible);

    // Assert
    expect(combustible).toEqual(['cigarettes', 'roll-your-own']);
  });
});

describe('hasSmokingHistory', () => {
  it('hasSmokingHistory_cigarettesWithoutHistory_isTrue', () => {
    // Arrange & Act
    const result = hasSmokingHistory(as('cigarettes', false));

    // Assert
    expect(result).toBe(true);
  });

  it('hasSmokingHistory_vapeWithoutHistory_isFalse', () => {
    // Arrange & Act
    const result = hasSmokingHistory(as('vape', false));

    // Assert
    expect(result).toBe(false);
  });

  it('hasSmokingHistory_heatedWithHistory_isTrue', () => {
    // Arrange & Act
    const result = hasSmokingHistory(as('heated', true));

    // Assert
    expect(result).toBe(true);
  });
});

describe('audienceIncludes', () => {
  // [audience, product, withHistory, expected]
  const table: [Audience, ProductId, boolean, boolean][] = [
    ['all', 'pouches', false, true],
    ['inhaled', 'vape', false, true],
    ['inhaled', 'snus', false, false],
    ['smoked', 'roll-your-own', false, true],
    ['smoked', 'heated', true, false],
    ['smoking-history', 'heated', true, true],
    ['smoking-history', 'vape', false, false],
    ['snus', 'snus', false, true],
    ['snus', 'pouches', false, false],
    ['oral', 'pouches', false, true],
    ['oral', 'heated', false, false],
    ['unknown-long-term', 'vape', false, true],
    ['unknown-long-term', 'vape', true, false],
    ['unknown-long-term', 'cigarettes', false, false],
  ];

  it.each(table)('audienceIncludes_%s_%s_history%s_is%s', (audience, product, withHistory, expected) => {
    // Arrange
    const settings = as(product, withHistory);

    // Act
    const result = audienceIncludes(audience, settings);

    // Assert
    expect(result).toBe(expected);
  });
});

describe('applicableMilestones', () => {
  it('applicableMilestones_overrideForProduct_replacesOffsetAndSource', () => {
    // Arrange
    const m = milestone('inhaled', { overrides: { vape: { offsetMs: MS_PER_HOUR, offsetEndMs: null, sourceId: 'nicotine-hr-acute' } } });

    // Act
    const [result] = applicableMilestones([m], as('vape', false));

    // Assert
    expect(result?.offsetMs).toBe(MS_PER_HOUR);
    expect(result?.sourceId).toBe('nicotine-hr-acute');
  });

  it('applicableMilestones_noOverrideForProduct_keepsDefaults', () => {
    // Arrange
    const m = milestone('inhaled', { overrides: { vape: { offsetMs: MS_PER_HOUR, offsetEndMs: null, sourceId: 'x' } } });

    // Act
    const [result] = applicableMilestones([m], as('cigarettes', false));

    // Assert
    expect(result?.offsetMs).toBe(20 * MS_PER_MINUTE);
  });

  it('applicableMilestones_audienceExcludesProduct_dropsMilestone', () => {
    // Arrange & Act
    const result = applicableMilestones([milestone('smoked')], as('pouches', true));

    // Assert
    expect(result).toEqual([]);
  });
});

describe('isConservativelyAnchored', () => {
  it('isConservativelyAnchored_smokingHistoryForSwitcher_isTrue', () => {
    // Arrange & Act
    const result = isConservativelyAnchored(milestone('smoking-history'), as('heated', true));

    // Assert
    expect(result).toBe(true);
  });

  it('isConservativelyAnchored_smokingHistoryForSmoker_isFalse', () => {
    // Arrange & Act
    const result = isConservativelyAnchored(milestone('smoking-history'), as('cigarettes', true));

    // Assert
    expect(result).toBe(false);
  });
});

describe('pickVariant', () => {
  it('pickVariant_combustibleAndNot_picksMatchingVariant', () => {
    // Arrange
    const variants = { smoke: 'CO', nicotine: 'nicotine' };

    // Act
    const smoker = pickVariant(variants, as('roll-your-own', false));
    const switcher = pickVariant(variants, as('heated', true));

    // Assert
    expect(smoker).toBe('CO');
    expect(switcher).toBe('nicotine');
  });
});
