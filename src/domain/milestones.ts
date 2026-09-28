import type { Anchors, Milestone, MilestoneState } from './types';

/** Which anchor a milestone measures from. `qualitative` milestones have no anchor. */
export function anchorFor(milestone: Milestone, anchors: Anchors): string | null {
  switch (milestone.slipBehavior) {
    case 'restarts':
      return anchors.fast;
    case 'cumulative':
      return anchors.cumulative;
    case 'qualitative':
      return null;
  }
}

export function resolveMilestone(milestone: Milestone, anchors: Anchors, now: Date): MilestoneState {
  const anchorIso = anchorFor(milestone, anchors);

  // Qualitative milestones are narrative: no date, no bar, always ongoing.
  if (anchorIso === null || milestone.offsetMs === null) {
    return { milestone, status: 'in-progress', reachedAt: null, projectedAt: null, progress: null, conservativelyAnchored: false };
  }

  const anchorMs = new Date(anchorIso).getTime();
  const startMs = anchorMs + milestone.offsetMs;
  const endMs = milestone.offsetEndMs === null ? null : anchorMs + milestone.offsetEndMs;
  const nowMs = now.getTime();

  const completionMs = endMs ?? startMs;

  if (nowMs >= completionMs) {
    return {
      milestone,
      status: 'reached',
      reachedAt: new Date(completionMs).toISOString(),
      projectedAt: null,
      progress: null,
      conservativelyAnchored: false,
    };
  }

  // Between start and end of a ranged milestone: genuinely underway.
  if (endMs !== null && nowMs >= startMs) {
    return {
      milestone,
      status: 'in-progress',
      reachedAt: null,
      projectedAt: new Date(endMs).toISOString(),
      progress: (nowMs - startMs) / (endMs - startMs),
      conservativelyAnchored: false,
    };
  }

  return {
    milestone,
    status: 'future',
    reachedAt: null,
    projectedAt: new Date(completionMs).toISOString(),
    progress: null,
    conservativelyAnchored: false,
  };
}

export function resolveMilestones(milestones: Milestone[], anchors: Anchors, now: Date): MilestoneState[] {
  return milestones.map((milestone) => resolveMilestone(milestone, anchors, now));
}
