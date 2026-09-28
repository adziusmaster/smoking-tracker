import { describe, expect, it } from 'vitest';
import { cigaretteSettings } from './testSettings';
import { buildTimeline } from './timeline';
import { MILESTONES } from '@/content/milestones';
import { DANGER_WINDOW_TIPS, PHASES } from '@/content/phases';
import { MS_PER_DAY, type Milestone, type Phase, type QuitState, type Settings, type TimelineViewModel } from './types';

const QUIT = '2026-06-26T08:00:00+02:00';
const NOW = new Date('2026-08-08T08:00:00+02:00');
const CIG = { one: 'cigarette', many: 'cigarettes' };

const phases: Phase[] = [
  { id: 'crash', name: 'The Crash', startMs: 0, endMs: 3 * MS_PER_DAY, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'], nameNicotine: null, whatsHappeningNicotine: '', whatsHappeningOral: null, howToCopeSmokeOnly: [], sources: [] },
  { id: 'fog', name: 'The Fog', startMs: 3 * MS_PER_DAY, endMs: 28 * MS_PER_DAY, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'], nameNicotine: null, whatsHappeningNicotine: '', whatsHappeningOral: null, howToCopeSmokeOnly: [], sources: [] },
  { id: 'consolidation', name: 'Consolidation', startMs: 28 * MS_PER_DAY, endMs: null, whatsHappening: '', whyYouFeelThisWay: '', howToCope: ['x'], nameNicotine: null, whatsHappeningNicotine: '', whatsHappeningOral: null, howToCopeSmokeOnly: [], sources: [] },
];

const milestones: Milestone[] = [
  { id: 'co', title: 'CO clears', body: '', offsetMs: MS_PER_DAY, offsetEndMs: null, slipBehavior: 'restarts', sourceId: 'acs', phaseId: 'crash', audience: 'all' },
  { id: 'taste', title: 'Taste returns', body: '', offsetMs: 14 * MS_PER_DAY, offsetEndMs: null, slipBehavior: 'cumulative', sourceId: 'acs', phaseId: 'fog', audience: 'all' },
  { id: 'cough', title: 'Cough fades', body: '', offsetMs: 30 * MS_PER_DAY, offsetEndMs: 365 * MS_PER_DAY, slipBehavior: 'cumulative', sourceId: 'acs', phaseId: 'consolidation', audience: 'all' },
];

const state: QuitState = {
  settings: cigaretteSettings({ quitDate: QUIT }),
  slips: [],
  periods: [], cravingEvents: [],
};

describe('buildTimeline', () => {
  it('buildTimeline_cleanFortyThreeDays_returnsElapsedSavingsAndCurrentPhase', () => {
    // Arrange
    const input = { state, milestones, phases, dangerTips: DANGER_WINDOW_TIPS, unit: CIG, now: NOW };

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
    const input = { state, milestones, phases, dangerTips: DANGER_WINDOW_TIPS, unit: CIG, now: NOW };

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
    const input = { state, milestones, phases, dangerTips: DANGER_WINDOW_TIPS, unit: CIG, now: NOW };

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
    const result = buildTimeline({ state: withSlip, milestones, phases, dangerTips: DANGER_WINDOW_TIPS, unit: CIG, now: NOW });

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
    const result = buildTimeline({ state: smoking, milestones, phases, dangerTips: DANGER_WINDOW_TIPS, unit: CIG, now: NOW });
    const later = buildTimeline({ state: smoking, milestones, phases, dangerTips: DANGER_WINDOW_TIPS, unit: CIG, now: muchLater });

    // Assert — the cumulative-anchor headline keeps climbing, the best run must not
    expect(result.longestStreak.elapsed.days).toBe(36);
    expect(later.longestStreak.elapsed.days).toBe(36);
    expect(later.elapsed.days).toBeGreaterThan(result.elapsed.days);
  });

  it('buildTimeline_allMilestonesReached_returnsNullNextMilestone', () => {
    // Arrange
    const now = new Date(new Date(QUIT).getTime() + 4000 * MS_PER_DAY);

    // Act
    const result = buildTimeline({ state, milestones, phases, dangerTips: DANGER_WINDOW_TIPS, unit: CIG, now });

    // Assert
    expect(result.nextMilestone).toBeNull();
  });
});

describe('buildTimeline by product', () => {
  const buildReal = (settings: Settings, now: Date = NOW): TimelineViewModel =>
    buildTimeline({ state: { settings, slips: [], periods: [], cravingEvents: [] }, milestones: MILESTONES, phases: PHASES, dangerTips: DANGER_WINDOW_TIPS, unit: CIG, now });
  const ids = (vm: TimelineViewModel) => vm.chapters.flatMap((c) => c.milestones.map((s) => s.milestone.id));
  const find = (vm: TimelineViewModel, id: string) => vm.chapters.flatMap((c) => c.milestones).find((s) => s.milestone.id === id);
  const heatedSwitcher = cigaretteSettings({ quitDate: QUIT, product: 'heated', cigaretteHistory: { months: 60, cigarettesPerDay: 10 } });
  const vapeNoHistory = cigaretteSettings({ quitDate: QUIT, product: 'vape', cost: { kind: 'weekly', weeklySpendMinor: 1500 }, cigaretteHistory: null });

  it('timeline_heatedWithHistory_showsLongTermButNotCarbonMonoxide', () => {
    // Arrange & Act
    const vm = buildReal(heatedSwitcher);

    // Assert
    expect(ids(vm)).toContain('heart-attack-risk');
    expect(ids(vm)).not.toContain('carbon-monoxide');
    expect(ids(vm)).not.toContain('long-term-unknown');
  });

  it('timeline_heatedSwitcher_marksOnlyLongTermMilestonesConservative', () => {
    // Arrange & Act
    const vm = buildReal(heatedSwitcher);

    // Assert
    expect(find(vm, 'heart-attack-risk')?.conservativelyAnchored).toBe(true);
    expect(find(vm, 'nicotine-cleared')?.conservativelyAnchored).toBe(false);
  });

  it('timeline_cigarettes_neverMarksMilestonesConservative', () => {
    // Arrange & Act
    const vm = buildReal(cigaretteSettings({ quitDate: QUIT }));

    // Assert
    expect(vm.chapters.flatMap((c) => c.milestones).some((s) => s.conservativelyAnchored)).toBe(false);
  });

  it('timeline_vapeWithoutHistory_showsUnknownLongTermAndNoAcsRiskMilestone', () => {
    // Arrange & Act
    const vm = buildReal(vapeNoHistory);

    // Assert
    expect(ids(vm)).toContain('long-term-unknown');
    expect(ids(vm)).not.toContain('lung-cancer-halved');
  });

  it('timeline_heated_hasNoHeartRateMilestone', () => {
    // Arrange — no study measures heart rate after stopping heated tobacco
    const settings = cigaretteSettings({ quitDate: QUIT, product: 'heated', cigaretteHistory: null });

    // Act
    const vm = buildReal(settings);

    // Assert
    expect(ids(vm)).not.toContain('heart-rate');
    expect(ids(vm)).not.toContain('vape-heart-rate');
  });

  it('timeline_vapeTwelveHoursIn_heartRateMilestoneNotYetReached', () => {
    // Arrange — cigarettes reach it at 20 minutes; the vape evidence is measured over days
    const settings = cigaretteSettings({ product: 'vape', quitDate: '2026-08-07T20:00:00+02:00', cost: { kind: 'weekly', weeklySpendMinor: 1500 }, cigaretteHistory: null });

    // Act
    const vm = buildReal(settings);

    // Assert
    expect(find(vm, 'vape-heart-rate')?.status).toBe('future');
    expect(ids(vm)).not.toContain('heart-rate');
  });

  it('timeline_snusVsPouches_onlySnusSeesMucosaMilestone', () => {
    // Arrange
    const snus = cigaretteSettings({ quitDate: QUIT, product: 'snus', cigaretteHistory: null });
    const pouches = cigaretteSettings({ quitDate: QUIT, product: 'pouches', cigaretteHistory: null });

    // Act
    const snusIds = ids(buildReal(snus));
    const pouchIds = ids(buildReal(pouches));

    // Assert
    expect(snusIds).toContain('snus-mucosa');
    expect(pouchIds).not.toContain('snus-mucosa');
  });
});

describe('buildTimeline tips', () => {
  it('timeline_dangerWindowForVape_tipsUseNicotineVariantWithUnitFilled', () => {
    // Arrange
    const settings = cigaretteSettings({ quitDate: QUIT, product: 'vape', cost: { kind: 'weekly', weeklySpendMinor: 1500 }, cigaretteHistory: null });
    const withSlip: QuitState = {
      settings,
      slips: [{ id: 1, occurredAt: '2026-08-07T22:00:00+02:00', unitCount: 1, trigger: null, note: null }],
      periods: [], cravingEvents: [],
    };

    // Act
    const vm = buildTimeline({ state: withSlip, milestones: MILESTONES, phases: PHASES, dangerTips: DANGER_WINDOW_TIPS, unit: { one: 'vape', many: 'vapes' }, now: NOW });

    // Assert
    expect(vm.currentTipsAreDangerWindow).toBe(true);
    expect(vm.currentTips.whatsHappening.toLowerCase()).not.toContain('carbon monoxide');
    expect(vm.currentTips.howToCope.join(' ')).not.toContain('{unit}');
    expect(vm.currentTips.howToCope.join(' ')).toContain('One vape');
  });

  it('timeline_noDangerWindow_currentTipsComeFromCurrentPhase', () => {
    // Arrange & Act
    const vm = buildTimeline({ state, milestones: MILESTONES, phases: PHASES, dangerTips: DANGER_WINDOW_TIPS, unit: CIG, now: NOW });

    // Assert
    expect(vm.currentTipsAreDangerWindow).toBe(false);
    expect(vm.currentTips.whatsHappening).toBe(vm.currentPhase.whatsHappening);
  });
});
