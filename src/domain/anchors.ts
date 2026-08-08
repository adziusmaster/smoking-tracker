import type { Anchors, QuitState } from './types';

/** Returns whichever ISO timestamp is later. */
function latest(a: string, b: string): string {
  return new Date(b).getTime() > new Date(a).getTime() ? b : a;
}

export function resolveAnchors(state: QuitState, _now: Date): Anchors {
  const { settings, slips, periods } = state;
  const completedEnds = periods
    .map((period) => period.endedAt)
    .filter((endedAt): endedAt is string => endedAt !== null);

  // Cumulative recovery is measured from sustained cessation, so only a completed
  // relapse period moves it. A slip never does.
  const cumulative = completedEnds.reduce(latest, settings.quitDate);

  // The fast anchor tracks the most recent nicotine in the bloodstream, whatever its source.
  const fast = slips.map((slip) => slip.occurredAt).reduce(latest, cumulative);

  return {
    fast,
    cumulative,
    isCurrentlySmoking: periods.some((period) => period.endedAt === null),
  };
}
