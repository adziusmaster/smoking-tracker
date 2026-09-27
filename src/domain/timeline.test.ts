import { describe, expect, it } from 'vitest';
import { cigaretteSettings } from './testSettings';
import { buildTimeline } from './timeline';
import { MS_PER_DAY, type Milestone, type Phase, type QuitState } from './types';

const QUIT = '2026-06-26T08:00:00+02:00';
const NOW = new Date('2026-08-08T08:00:00+02:00');

const phases: Phase[] = [
  { id: 'crash', name: 'The Crash', startMs: 0, endMs: 3 * MS_PER_DAY, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'] },
  { id: 'fog', name: 'The Fog', startMs: 3 * MS_PER_DAY, endMs: 28 * MS_PER_DAY, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'] },
  { id: 'consolidation', name: 'Consolidation', startMs: 28 * MS_PER_DAY, endMs: null, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'] },
];

const milestones: Milestone[] = [
  { id: 'co', title: 'CO clears', body: '', offsetMs: MS_PER_DAY, offsetEndMs: null, slipBehavior: 'restarts', sourceId: 'acs', phaseId: 'crash' },
  { id: 'taste', title: 'Taste returns', body: '', offsetMs: 14 * MS_PER_DAY, offsetEndMs: null, slipBehavior: 'cumulative', sourceId: 'acs', phaseId: 'fog' },
  { id: 'cough', title: 'Cough fades', body: '', offsetMs: 30 * MS_PER_DAY, offsetEndMs: 365 * MS_PER_DAY, slipBehavior: 'cumulative', sourceId: 'acs', phaseId: 'consolidation' },
];

const state: QuitState = {
  settings: cigaretteSettings({ quitDate: QUIT }),
  slips: [],
  periods: [],
};

describe('buildTimeline', () => {
  it('buildTimeline_cleanFortyThreeDays_returnsElapsedSavingsAndCurrentPhase', () => {
    // Arrange
    const input = { state, milestones, phases, now: NOW };

    // Act
    const result = buildTimeline(input);

    // Assert
    expect(result.elapsed.days).toBe(43);
    expect(result.savings.unitsAvoided).toBe(645);
    expect(result.currentPhase.id).toBe('consolidation');
    expect(result.dangerWindow.active).toBe(false);
  });

  it('buildTimeline_groupsMilestonesIntoChaptersMarkingPastCurrentAndFuture', () => {
    // Arrange
    const input = { state, milestones, phases, now: NOW };

    // Act
    const result = buildTimeline(input);

    // Assert
    expect(result.chapters.map((c) => [c.phase.id, c.status])).toEqual([
      ['crash', 'past'],
      ['fog', 'past'],
      ['consolidation', 'current'],
    ]);
    expect(result.chapters[0]?.milestones.map((m) => m.milestone.id)).toEqual(['co']);
  });

  it('buildTimeline_nextMilestone_isTheSoonestUnreachedOne', () => {
    // Arrange
    const input = { state, milestones, phases, now: NOW };

    // Act
    const result = buildTimeline(input);

    // Assert — 'cough' is in progress (ends at day 365) and is the only unreached one
    expect(result.nextMilestone?.milestone.id).toBe('cough');
  });

  it('buildTimeline_afterSlip_restartsFastMilestoneButKeepsCumulativeOnes', () => {
    // Arrange — slip 10 hours before now, so the 24 h CO milestone is unreached again
    const withSlip: QuitState = {
      ...state,
      slips: [{ id: 1, occurredAt: '2026-08-07T22:00:00+02:00', unitCount: 3, trigger: 'alcohol', note: null }],
    };

    // Act
    const result = buildTimeline({ state: withSlip, milestones, phases, now: NOW });

    // Assert
    const byId = new Map(result.chapters.flatMap((c) => c.milestones).map((m) => [m.milestone.id, m.status]));
    expect(byId.get('co')).toBe('future');
    expect(byId.get('taste')).toBe('reached');
    expect(result.dangerWindow.active).toBe(true);
    // The headline streak is the honest-setback promise: a slip must never zero it.
    // It tracks the cumulative anchor (sustained cessation), not the fast anchor (last
    // nicotine), so one cigarette after 43 clean days must never read back as day zero.
    expect(result.elapsed.days).toBe(43);
    expect(result.anchors.cumulative).toBe(QUIT);
    expect(result.anchors.fast).toBe('2026-08-07T22:00:00+02:00');
  });

  it('buildTimeline_openSmokingPeriod_reportsALongestStreakThatDoesNotFollowTheClock', () => {
    // Arrange — smoking again since 1 August, i.e. 36 clean days before that
    const smoking: QuitState = {
      ...state,
      periods: [{ id: 1, startedAt: '2026-08-01T08:00:00+02:00', endedAt: null, averageUnitsPerDay: 20, note: null }],
    };
    const muchLater = new Date('2026-10-08T08:00:00+02:00');

    // Act
    const result = buildTimeline({ state: smoking, milestones, phases, now: NOW });
    const later = buildTimeline({ state: smoking, milestones, phases, now: muchLater });

    // Assert — the cumulative-anchor headline keeps climbing, the best run must not
    expect(result.longestStreak.elapsed.days).toBe(36);
    expect(later.longestStreak.elapsed.days).toBe(36);
    expect(later.elapsed.days).toBeGreaterThan(result.elapsed.days);
  });

  it('buildTimeline_allMilestonesReached_returnsNullNextMilestone', () => {
    // Arrange
    const now = new Date(new Date(QUIT).getTime() + 4000 * MS_PER_DAY);

    // Act
    const result = buildTimeline({ state, milestones, phases, now });

    // Assert
    expect(result.nextMilestone).toBeNull();
  });
});
