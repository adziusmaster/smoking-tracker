import { resolveAnchors } from './anchors';
import { elapsedSince } from './elapsed';
import { resolveMilestones } from './milestones';
import { applicableMilestones, isConservativelyAnchored, pickVariant } from './products';
import { fillUnitTokens } from './format';
import { resolveDangerWindow, resolvePhase, resolvePhaseCopy } from './phases';
import { computeSavings } from './savings';
import { longestSmokeFreeStreak } from './streaks';
import type {
  Chapter,
  DangerTips,
  TipContent,
  UnitWords,
  Milestone,
  MilestoneState,
  Phase,
  QuitState,
  TimelineViewModel,
} from './types';

export interface TimelineInput {
  state: QuitState;
  milestones: Milestone[];
  phases: Phase[];
  dangerTips: DangerTips;
  unit: UnitWords;
  now: Date;
}

/** The soonest unreached milestone, ranked by its projected date. */
function pickNext(states: MilestoneState[]): MilestoneState | null {
  const upcoming = states
    .filter((milestoneState) => milestoneState.status !== 'reached' && milestoneState.projectedAt !== null)
    .sort((a, b) => new Date(a.projectedAt as string).getTime() - new Date(b.projectedAt as string).getTime());

  return upcoming[0] ?? null;
}

export function buildTimeline({ state, milestones, phases: rawPhases, dangerTips, unit, now }: TimelineInput): TimelineViewModel {
  const phases = rawPhases.map((phase) => resolvePhaseCopy(phase, state.settings, unit));
  const anchors = resolveAnchors(state, now);
  const currentPhase = resolvePhase(phases, anchors, now);
  // Filter and apply per-product overrides BEFORE resolving, so nothing downstream —
  // chapters, nextMilestone, notification planning — can see a claim that does not apply.
  const milestoneStates = resolveMilestones(applicableMilestones(milestones, state.settings), anchors, now).map(
    (milestoneState) => ({
      ...milestoneState,
      conservativelyAnchored: isConservativelyAnchored(milestoneState.milestone, state.settings),
    }),
  );

  const currentIndex = phases.findIndex((phase) => phase.id === currentPhase.id);

  const chapters: Chapter[] = phases.map((phase, index) => ({
    phase,
    status: index < currentIndex ? 'past' : index === currentIndex ? 'current' : 'future',
    milestones: milestoneStates.filter((milestoneState) => milestoneState.milestone.phaseId === phase.id),
  }));

  const dangerWindow = resolveDangerWindow(state.slips, now);
  const currentTips: TipContent = dangerWindow.active
    ? {
        whatsHappening: pickVariant(dangerTips.whatsHappening, state.settings),
        whyYouFeelThisWay: dangerTips.whyYouFeelThisWay,
        howToCope: dangerTips.howToCope.map((tip) => fillUnitTokens(tip, unit)),
        sourceIds: dangerTips.sources,
      }
    : {
        whatsHappening: currentPhase.whatsHappening,
        whyYouFeelThisWay: currentPhase.whyYouFeelThisWay,
        howToCope: currentPhase.howToCope,
        sourceIds: currentPhase.sources,
      };

  return {
    // Displayed streak follows the cumulative anchor: a slip does not zero the counter.
    elapsed: elapsedSince(anchors.cumulative, now),
    // The cumulative anchor keeps moving while a period is open, so it can never answer
    // "what was your best run?" — that comes from the closed streak boundaries instead.
    longestStreak: longestSmokeFreeStreak(state, now),
    savings: computeSavings(state, now),
    anchors,
    currentPhase,
    dangerWindow,
    chapters,
    nextMilestone: pickNext(milestoneStates),
    currentTips,
    currentTipsAreDangerWindow: dangerWindow.active,
  };
}
