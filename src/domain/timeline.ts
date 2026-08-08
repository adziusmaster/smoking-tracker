import { resolveAnchors } from './anchors';
import { elapsedSince } from './elapsed';
import { resolveMilestones } from './milestones';
import { resolveDangerWindow, resolvePhase } from './phases';
import { computeSavings } from './savings';
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
  const milestoneStates = resolveMilestones(milestones, anchors, now);

  const currentIndex = phases.findIndex((phase) => phase.id === currentPhase.id);

  const chapters: Chapter[] = phases.map((phase, index) => ({
    phase,
    status: index < currentIndex ? 'past' : index === currentIndex ? 'current' : 'future',
    milestones: milestoneStates.filter((milestoneState) => milestoneState.milestone.phaseId === phase.id),
  }));

  return {
    // Displayed streak follows the cumulative anchor: a slip does not zero the counter.
    elapsed: elapsedSince(anchors.cumulative, now),
    savings: computeSavings(state, now),
    anchors,
    currentPhase,
    dangerWindow: resolveDangerWindow(state.slips, now),
    chapters,
    nextMilestone: pickNext(milestoneStates),
  };
}
