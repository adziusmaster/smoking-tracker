import { describe, expect, it } from 'vitest';
import { PHASES } from '@/content/phases';
import { resolveDangerWindow, resolvePhase, resolvePhaseCopy } from './phases';
import { cigaretteSettings } from './testSettings';
import { MS_PER_DAY, type Anchors, type Phase, type Slip } from './types';

const QUIT = '2026-06-26T08:00:00+02:00';

const phases: Phase[] = [
  { id: 'crash', name: 'The Crash', startMs: 0, endMs: 3 * MS_PER_DAY, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'], nameNicotine: null, whatsHappeningNicotine: '', whatsHappeningOral: null, howToCopeSmokeOnly: [], sources: [] },
  { id: 'fog', name: 'The Fog', startMs: 3 * MS_PER_DAY, endMs: 28 * MS_PER_DAY, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'], nameNicotine: null, whatsHappeningNicotine: '', whatsHappeningOral: null, howToCopeSmokeOnly: [], sources: [] },
  { id: 'consolidation', name: 'Consolidation', startMs: 28 * MS_PER_DAY, endMs: null, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'], nameNicotine: null, whatsHappeningNicotine: '', whatsHappeningOral: null, howToCopeSmokeOnly: [], sources: [] },
];

const anchors = (overrides: Partial<Anchors> = {}): Anchors => ({
  fast: QUIT,
  cumulative: QUIT,
  isCurrentlySmoking: false,
  ...overrides,
});

const slip = (occurredAt: string, id = 1): Slip => ({ id, occurredAt, unitCount: 3, trigger: null, note: null, product: null });

describe('resolvePhase', () => {
  it('resolvePhase_dayOne_returnsTheCrash', () => {
    // Arrange
    const now = new Date(new Date(QUIT).getTime() + 1 * MS_PER_DAY);

    // Act
    const result = resolvePhase(phases, anchors(), now);

    // Assert
    expect(result.id).toBe('crash');
  });

  it('resolvePhase_exactlyOnPhaseBoundary_returnsTheLaterPhase', () => {
    // Arrange
    const now = new Date(new Date(QUIT).getTime() + 3 * MS_PER_DAY);

    // Act
    const result = resolvePhase(phases, anchors(), now);

    // Assert
    expect(result.id).toBe('fog');
  });

  it('resolvePhase_recentSlip_doesNotDropBackToTheCrash', () => {
    // Arrange — 43 days of cumulative abstinence, slip 3 days ago
    const now = new Date('2026-08-08T08:00:00+02:00');
    const input = anchors({ fast: '2026-08-05T22:00:00+02:00', cumulative: QUIT });

    // Act
    const result = resolvePhase(phases, input, now);

    // Assert
    expect(result.id).toBe('consolidation');
  });

  it('resolvePhase_beyondTheLastBoundary_returnsTheOpenEndedPhase', () => {
    // Arrange
    const now = new Date(new Date(QUIT).getTime() + 4000 * MS_PER_DAY);

    // Act
    const result = resolvePhase(phases, anchors(), now);

    // Assert
    expect(result.id).toBe('consolidation');
  });
});

describe('resolveDangerWindow', () => {
  it('resolveDangerWindow_noSlips_isInactive', () => {
    // Arrange
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = resolveDangerWindow([], now);

    // Assert
    expect(result).toEqual({ active: false, endsAt: null, daysRemaining: null, triggeredBySlipId: null });
  });

  it('resolveDangerWindow_eighteenDaysAfterSlip_isActiveWithOneDayRemaining', () => {
    // Arrange
    const occurredAt = '2026-07-21T08:00:00+02:00';
    const now = new Date(new Date(occurredAt).getTime() + 18 * MS_PER_DAY);

    // Act
    const result = resolveDangerWindow([slip(occurredAt, 7)], now);

    // Assert
    expect(result.active).toBe(true);
    expect(result.daysRemaining).toBe(1);
    expect(result.triggeredBySlipId).toBe(7);
  });

  it('resolveDangerWindow_twentyDaysAfterSlip_isInactive', () => {
    // Arrange
    const occurredAt = '2026-07-19T08:00:00+02:00';
    const now = new Date(new Date(occurredAt).getTime() + 20 * MS_PER_DAY);

    // Act
    const result = resolveDangerWindow([slip(occurredAt)], now);

    // Assert
    expect(result.active).toBe(false);
  });

  it('resolveDangerWindow_multipleSlips_measuresFromTheMostRecent', () => {
    // Arrange
    const old = '2026-07-01T08:00:00+02:00';
    const recent = '2026-08-06T08:00:00+02:00';
    const now = new Date('2026-08-08T08:00:00+02:00');

    // Act
    const result = resolveDangerWindow([slip(old, 1), slip(recent, 2)], now);

    // Assert
    expect(result.active).toBe(true);
    expect(result.triggeredBySlipId).toBe(2);
  });
});

describe('resolvePhaseCopy', () => {
  const unit = { one: 'vape', many: 'vapes' };
  const vape = cigaretteSettings({ product: 'vape', cost: { kind: 'weekly', weeklySpendMinor: 1 }, cigaretteHistory: null });
  const phase = (id: string): Phase => {
    const found = PHASES.find((p) => p.id === id);
    if (!found) throw new Error(`fixture: no phase ${id}`);
    return found;
  };

  it('resolvePhaseCopy_vapeInCrash_usesNicotineText', () => {
    // Arrange
    const crash = phase('crash');

    // Act
    const resolved = resolvePhaseCopy(crash, vape, unit);

    // Assert
    expect(resolved.whatsHappening).toBe(crash.whatsHappeningNicotine);
    expect(resolved.whatsHappening.toLowerCase()).not.toContain('carbon monoxide');
  });

  it('resolvePhaseCopy_heatedSwitcherInLongHaul_usesSmokeText', () => {
    // Arrange
    const longHaul = phase('long-haul');
    const settings = cigaretteSettings({ product: 'heated', cigaretteHistory: { months: 12, cigarettesPerDay: 10 } });

    // Act
    const resolved = resolvePhaseCopy(longHaul, settings, unit);

    // Assert
    expect(resolved.whatsHappening).toBe(longHaul.whatsHappening);
  });

  it('resolvePhaseCopy_pouchesInCrash_usesOralText', () => {
    // Arrange
    const crash = phase('crash');
    const settings = cigaretteSettings({ product: 'pouches', cigaretteHistory: null });

    // Act
    const resolved = resolvePhaseCopy(crash, settings, unit);

    // Assert
    expect(resolved.whatsHappening).toBe(crash.whatsHappeningOral);
  });

  it('resolvePhaseCopy_nonCombustibleFinalPhase_isRenamed', () => {
    // Arrange
    const last = phase('non-smoker');

    // Act
    const resolved = resolvePhaseCopy(last, vape, unit);

    // Assert
    expect(resolved.name).toBe('Nicotine-Free');
  });

  it('resolvePhaseCopy_consolidationForVape_dropsSmokeOnlyTip', () => {
    // Arrange
    const consolidation = phase('consolidation');

    // Act
    const resolved = resolvePhaseCopy(consolidation, vape, unit);

    // Assert
    expect(resolved.howToCope.join(' ')).not.toMatch(/tar|cilia/i);
  });

  it('resolvePhaseCopy_cigarettes_appendsSmokeOnlyTips', () => {
    // Arrange
    const withSmokeTip: Phase = { ...phase('consolidation'), howToCopeSmokeOnly: ['smoke-only tip'] };

    // Act
    const resolved = resolvePhaseCopy(withSmokeTip, cigaretteSettings(), { one: 'cigarette', many: 'cigarettes' });
    const forVape = resolvePhaseCopy(withSmokeTip, vape, unit);

    // Assert
    expect(resolved.howToCope).toContain('smoke-only tip');
    expect(forVape.howToCope).not.toContain('smoke-only tip');
  });
});
