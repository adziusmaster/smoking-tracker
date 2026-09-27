import { resolveAnchors } from './anchors';
import { elapsedSince } from './elapsed';
import { resolveMilestones } from './milestones';
import { applicableMilestones, isConservativelyAnchored } from './products';
import { resolveDangerWindow, resolvePhase } from './phases';
import { computeSavings } from './savings';
import { longestSmokeFreeStreak } from './streaks';
import type {
  Chapter,
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
  now: Date;
}

/** The soonest unreached milestone, ranked by its projected date. */
function pickNext(states: MilestoneState[]): MilestoneState | null {
  const upcoming = states
    .filter((milestoneState) => milestoneState.status !== 'reached' && milestoneState.projectedAt !== null)
    .sort((a, b) => new Date(a.projectedAt as string).getTime() - new Date(b.projectedAt as string).getTime());

  return upcoming[0] ?? null;
}

export function buildTimeline({ state, milestones, phases, now }: TimelineInput): TimelineViewModel {
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

  return {
    // Displayed streak follows the cumulative anchor: a slip does not zero the counter.
    elapsed: elapsedSince(anchors.cumulative, now),
    // The cumulative anchor keeps moving while a period is open, so it can never answer
    // "what was your best run?" — that comes from the closed streak boundaries instead.
    longestStreak: longestSmokeFreeStreak(state, now),
    savings: computeSavings(state, now),
    anchors,
    currentPhase,
    dangerWindow: resolveDangerWindow(state.slips, now),
    chapters,
    nextMilestone: pickNext(milestoneStates),
  };
}
