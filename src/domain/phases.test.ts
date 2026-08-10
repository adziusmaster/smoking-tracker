import { describe, expect, it } from 'vitest';
import { resolveDangerWindow, resolvePhase } from './phases';
import { MS_PER_DAY, type Anchors, type Phase, type Slip } from './types';

const QUIT = '2026-06-26T08:00:00+02:00';

const phases: Phase[] = [
  { id: 'crash', name: 'The Crash', startMs: 0, endMs: 3 * MS_PER_DAY, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'] },
  { id: 'fog', name: 'The Fog', startMs: 3 * MS_PER_DAY, endMs: 28 * MS_PER_DAY, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'] },
  { id: 'consolidation', name: 'Consolidation', startMs: 28 * MS_PER_DAY, endMs: null, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'] },
];

const anchors = (overrides: Partial<Anchors> = {}): Anchors => ({
  fast: QUIT,
  cumulative: QUIT,
  isCurrentlySmoking: false,
  ...overrides,
});

const slip = (occurredAt: string, id = 1): Slip => ({ id, occurredAt, cigaretteCount: 3, trigger: null, note: null });

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
